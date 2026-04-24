#!/usr/bin/env node
/**
 * in-parallel.mjs — memory-budgeted command wrapper for the Franklin monorepo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * When multiple AI agents (Claude Code / Superconductor sessions) operate on
 * separate git worktrees of this repo concurrently, each one independently
 * invokes `npm run build` / `test` / `lint`. Those spawn `tsc`, `vitest`, and
 * `eslint` — each typically 0.5–2.5 GB of RSS. On a 10 GB Mac with 3–4 agents
 * in parallel, total memory pressure exceeds capacity, causing swap thrash and
 * OOM kills that corrupt builds.
 *
 * Turborepo's `--concurrency` and Vitest's `--maxWorkers` coordinate WITHIN a
 * single invocation, not ACROSS independent shells, so they don't help. This
 * wrapper is a tiny local coordinator: each caller declares "I will use ~N MB",
 * the wrapper tracks the in-flight total in a shared state file in $TMPDIR,
 * and blocks new tasks until there is budget.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Parse `--mb N` (estimate) and the child command.
 *   2. Resolve the machine's memory budget (see Env Vars). If gating is off,
 *      exec the child directly — true no-op.
 *   3. Acquire a slot: under a file lock, prune dead PIDs from the state file,
 *      and if (inFlight + N + 100 <= budget) OR no tasks are in-flight, append
 *      our entry and release the lock. Otherwise retry after a short sleep.
 *   4. Spawn the child with inherited stdio. Forward SIGINT/SIGTERM.
 *   5. On child exit, remove our entry from the state file and exit with the
 *      child's code.
 *
 * State file: `$TMPDIR/franklin-in-parallel.json` (single shared path so all
 * worktrees on this machine coordinate). Entries look like:
 *   { pid, name, mb, startedAt }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENVIRONMENT VARIABLES
 * ─────────────────────────────────────────────────────────────────────────────
 *   FRANKLIN_MEM_BUDGET_MB       explicit total budget across all in-flight
 *                                tasks on this machine. When set, this takes
 *                                precedence over autodetect.
 *   FRANKLIN_MEM_AUTODETECT      "1" to derive budget from 60% of os.totalmem()
 *                                when FRANKLIN_MEM_BUDGET_MB is unset.
 *                                Default is off — gating is fully opt-in.
 *   FRANKLIN_INPARALLEL_POLL_MS  retry interval when queued (default 500)
 *   FRANKLIN_INPARALLEL_STATE    override state file path
 *   FRANKLIN_INPARALLEL_VERBOSE  log queue waits to stderr when set
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *   in-parallel --mb 2000 --name root-build -- tsc -b
 *   FRANKLIN_INPARALLEL_VERBOSE=1 npm run build    # watch queue behaviour
 *
 * A 100 MB pad is added to every --mb value to cover npm/node overhead and
 * estimation slop. To calibrate --mb for a specific command, use the sibling
 * `scripts/memory-estimate.mjs` tool — not this wrapper.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEGRADATION
 * ─────────────────────────────────────────────────────────────────────────────
 * With no env vars set, the wrapper is a no-op (exec the child directly) —
 * this is the default for CI, Windows, and any contributor who hasn't opted
 * in. Gating works on darwin/linux/win32 when enabled.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SIGNALS & CRASHES
 * ─────────────────────────────────────────────────────────────────────────────
 *   - SIGINT / SIGTERM → forward to child; release slot; exit with signal.
 *   - Wrapper crash (uncaught throw) → release slot in the catch handler.
 *   - Wrapper SIGKILL'd → state entry is leaked. Next caller prunes it via
 *     a `process.kill(pid, 0)` liveness probe.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CAVEAT: nested invocations
 * ─────────────────────────────────────────────────────────────────────────────
 * If a wrapped script internally invokes another wrapped script, both count
 * against the budget (double-counting). The current script graph avoids this:
 * root-level build/test/lint are single processes that don't recursively call
 * workspace scripts. Refactors that introduce turborepo or similar fan-out at
 * root should revisit this.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir, totalmem } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

import lockfile from 'proper-lockfile';

const STATE_PATH =
	process.env.FRANKLIN_INPARALLEL_STATE ??
	join(tmpdir(), 'franklin-in-parallel.json');
const POLL_MS = Number(process.env.FRANKLIN_INPARALLEL_POLL_MS ?? 500);
const VERBOSE = Boolean(process.env.FRANKLIN_INPARALLEL_VERBOSE);
const MB_PAD = 100;

/**
 * Parse CLI args of the form `--mb N [--name S] -- <cmd> [args...]`.
 * @param {string[]} argv
 * @returns {{ mb: number|null, name: string|null, cmd: string[] }}
 */
function parseArgs(argv) {
	let mb = null;
	let name = null;
	let i = 0;
	while (i < argv.length && argv[i] !== '--') {
		const flag = argv[i];
		if (flag === '--mb') {
			mb = Number(argv[++i]);
		} else if (flag === '--name') {
			name = argv[++i];
		} else {
			throw new Error(`unknown flag: ${flag}`);
		}
		i++;
	}
	if (argv[i] !== '--') {
		throw new Error('missing `--` separator before child command');
	}
	const cmd = argv.slice(i + 1);
	if (cmd.length === 0) {
		throw new Error('missing command after `--`');
	}
	return { mb, name: name ?? basename(cmd[0]), cmd };
}

/**
 * Determine the total memory budget for this machine.
 * @returns {number|null} budget in MB, or null if gating is disabled
 */
function resolveBudget() {
	const explicit = process.env.FRANKLIN_MEM_BUDGET_MB;
	if (explicit) {
		const n = Number(explicit);
		return Number.isFinite(n) && n > 0 ? n : null;
	}
	if (process.env.FRANKLIN_MEM_AUTODETECT === '1') {
		return Math.floor((totalmem() * 0.6) / 1024 / 1024);
	}
	return null;
}

/**
 * Probe whether a PID is still alive using a null signal.
 * @param {number} pid
 */
function isPidAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (err) {
		return err && err.code === 'EPERM';
	}
}

async function readState() {
	if (!existsSync(STATE_PATH)) return { entries: [] };
	try {
		const raw = await readFile(STATE_PATH, 'utf8');
		const parsed = JSON.parse(raw);
		if (!parsed || !Array.isArray(parsed.entries)) return { entries: [] };
		return parsed;
	} catch {
		return { entries: [] };
	}
}

async function writeState(state) {
	await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

/**
 * Drop entries whose owning wrapper process is no longer running.
 */
function pruneStale(state) {
	state.entries = state.entries.filter((e) => isPidAlive(e.pid));
	return state;
}

async function ensureStateFile() {
	if (!existsSync(STATE_PATH)) {
		await writeFile(STATE_PATH, JSON.stringify({ entries: [] }, null, 2));
	}
}

async function withLock(fn) {
	await ensureStateFile();
	const release = await lockfile.lock(STATE_PATH, {
		retries: { retries: 40, minTimeout: 25, maxTimeout: 250 },
		stale: 30_000,
		realpath: false,
	});
	try {
		return await fn();
	} finally {
		await release();
	}
}

/**
 * Block until there is budget for `mb` additional MB, then record our slot.
 * @param {string} name
 * @param {number} mb — already padded
 * @param {number} budget
 */
async function acquire(name, mb, budget) {
	for (;;) {
		const ok = await withLock(async () => {
			const state = pruneStale(await readState());
			const inFlight = state.entries.reduce((s, e) => s + e.mb, 0);
			const alone = state.entries.length === 0;
			if (alone || inFlight + mb <= budget) {
				state.entries.push({
					pid: process.pid,
					name,
					mb,
					startedAt: new Date().toISOString(),
				});
				await writeState(state);
				return true;
			}
			if (VERBOSE) {
				process.stderr.write(
					`[in-parallel] queued ${name} (${mb}MB) — inFlight=${inFlight}MB budget=${budget}MB\n`,
				);
			}
			return false;
		});
		if (ok) return;
		await sleep(POLL_MS);
	}
}

/**
 * Remove our slot from the state file. Best-effort; ignores errors so we
 * never mask a child-command exit code behind a cleanup failure.
 */
async function release() {
	try {
		await withLock(async () => {
			const state = await readState();
			state.entries = state.entries.filter((e) => e.pid !== process.pid);
			await writeState(state);
		});
	} catch {
		// best-effort; a stale entry will be pruned by the next caller
	}
}

/**
 * Spawn the child, forward signals, and resolve with its exit code.
 * @param {string} cmd
 * @param {string[]} args
 */
function runChild(cmd, args) {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, { stdio: 'inherit' });
		const forward = (sig) => {
			try {
				child.kill(sig);
			} catch {
				// child already gone
			}
		};
		process.on('SIGINT', () => forward('SIGINT'));
		process.on('SIGTERM', () => forward('SIGTERM'));
		child.on('error', (err) => {
			process.stderr.write(`[in-parallel] spawn error: ${err.message}\n`);
			resolve(1);
		});
		child.on('exit', (code, signal) => {
			if (signal === 'SIGINT') resolve(130);
			else if (signal === 'SIGTERM') resolve(143);
			else resolve(code ?? 1);
		});
	});
}

async function main() {
	let parsed;
	try {
		parsed = parseArgs(process.argv.slice(2));
	} catch (err) {
		process.stderr.write(`[in-parallel] ${err.message}\n`);
		process.stderr.write(
			'usage: in-parallel --mb <n> [--name <s>] -- <cmd> [args...]\n',
		);
		process.exit(2);
	}
	const { mb, name, cmd } = parsed;
	const [bin, ...rest] = cmd;

	if (mb === null || !Number.isFinite(mb) || mb <= 0) {
		process.stderr.write('[in-parallel] --mb <positive integer> is required\n');
		process.exit(2);
	}

	const budget = resolveBudget();
	if (budget === null) {
		const code = await runChild(bin, rest);
		process.exit(code);
	}

	const effectiveMb = mb + MB_PAD;
	await acquire(name, effectiveMb, budget);
	let code;
	try {
		code = await runChild(bin, rest);
	} finally {
		await release();
	}
	process.exit(code);
}

main().catch(async (err) => {
	process.stderr.write(`[in-parallel] fatal: ${err?.stack ?? err}\n`);
	await release();
	process.exit(1);
});
