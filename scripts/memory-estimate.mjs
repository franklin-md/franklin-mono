#!/usr/bin/env node
/**
 * memory-estimate.mjs — peak-RSS estimator for calibrating `--mb` values in
 * `scripts/in-parallel.mjs` wrappers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT DOES
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs a command (optionally multiple times), samples the RSS of the entire
 * process tree every 500ms via `ps`, and reports peak memory plus a suggested
 * `--mb` value to drop into `package.json` for the corresponding wrapped
 * script.
 *
 * It does NOT use gating — it measures ground truth. Run when the machine
 * is otherwise quiet for the most representative numbers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *   node scripts/memory-estimate.mjs [--runs N] [--label S] -- <cmd> [args...]
 *
 * Examples:
 *   node scripts/memory-estimate.mjs -- npm run build -w @franklin/agent
 *   node scripts/memory-estimate.mjs --runs 3 --label ui-test -- \
 *     npm run test -w @franklin/ui
 *
 * Flags:
 *   --runs N    run the command N times (default 1) and aggregate peaks
 *   --label S   human-readable label for the summary line
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RECOMMENDED --mb
 * ─────────────────────────────────────────────────────────────────────────────
 * The recommendation is `ceil(max_peak * 1.15 / 50) * 50` — 15% headroom over
 * the worst observed peak, rounded up to the nearest 50 MB. Note that the
 * in-parallel wrapper additionally pads every --mb by +100 MB at runtime, so
 * you don't need to add margin for npm/node overhead yourself.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PLATFORM
 * ─────────────────────────────────────────────────────────────────────────────
 * POSIX only (darwin/linux) — shells out to `ps -eo pid,ppid,rss`. Windows
 * support is not implemented; contributors on Windows should either take
 * estimates from a Mac/Linux machine or skip calibration and use conservative
 * defaults.
 */

import { execFile, spawn } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * @returns {{ runs: number, label: string|null, cmd: string[] }}
 */
function parseArgs(argv) {
	let runs = 1;
	let label = null;
	let i = 0;
	while (i < argv.length && argv[i] !== '--') {
		const flag = argv[i];
		if (flag === '--runs') {
			runs = Number(argv[++i]);
		} else if (flag === '--label') {
			label = argv[++i];
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
	if (!Number.isFinite(runs) || runs < 1) {
		throw new Error('--runs must be a positive integer');
	}
	return { runs, label: label ?? basename(cmd[0]), cmd };
}

/**
 * Walk the process tree rooted at `rootPid` and return total RSS (MB).
 * POSIX only — uses `ps -eo pid,ppid,rss`.
 */
async function rssTreeMb(rootPid) {
	try {
		const { stdout } = await execFileAsync('ps', ['-eo', 'pid,ppid,rss']);
		const procs = stdout
			.trim()
			.split('\n')
			.slice(1)
			.map((line) => {
				const [pid, ppid, rss] = line.trim().split(/\s+/).map(Number);
				return { pid, ppid, rss };
			});
		const tree = new Set([rootPid]);
		let changed = true;
		while (changed) {
			changed = false;
			for (const p of procs) {
				if (!tree.has(p.pid) && tree.has(p.ppid)) {
					tree.add(p.pid);
					changed = true;
				}
			}
		}
		let totalKb = 0;
		for (const p of procs) if (tree.has(p.pid)) totalKb += p.rss;
		return Math.round(totalKb / 1024);
	} catch {
		return 0;
	}
}

/**
 * Run the command once, sampling the process tree every 500ms.
 * @returns {Promise<{ peak: number, code: number }>}
 */
async function measureOnce(cmd, args) {
	const child = spawn(cmd, args, { stdio: 'inherit' });
	let peak = 0;
	const timer = setInterval(async () => {
		const mb = await rssTreeMb(child.pid);
		if (mb > peak) peak = mb;
	}, 500);
	const forward = (sig) => {
		try {
			child.kill(sig);
		} catch {
			// child already gone
		}
	};
	process.on('SIGINT', () => forward('SIGINT'));
	process.on('SIGTERM', () => forward('SIGTERM'));
	const code = await new Promise((resolve) => {
		child.on('error', (err) => {
			process.stderr.write(`[memory-estimate] spawn error: ${err.message}\n`);
			resolve(1);
		});
		child.on('exit', (c, s) => {
			if (s === 'SIGINT') resolve(130);
			else if (s === 'SIGTERM') resolve(143);
			else resolve(c ?? 1);
		});
	});
	clearInterval(timer);
	return { peak, code };
}

function ceilTo50(n) {
	return Math.ceil((n * 1.15) / 50) * 50;
}

function stats(values) {
	const sorted = [...values].sort((a, b) => a - b);
	const min = sorted[0];
	const max = sorted[sorted.length - 1];
	const mean = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
	const p95Idx = Math.min(
		sorted.length - 1,
		Math.ceil(0.95 * sorted.length) - 1,
	);
	const p95 = sorted[p95Idx];
	return { min, max, mean, p95 };
}

async function main() {
	if (process.platform === 'win32') {
		process.stderr.write(
			'[memory-estimate] not supported on win32 in v1 (POSIX `ps` required)\n',
		);
		process.exit(2);
	}

	let parsed;
	try {
		parsed = parseArgs(process.argv.slice(2));
	} catch (err) {
		process.stderr.write(`[memory-estimate] ${err.message}\n`);
		process.stderr.write(
			'usage: memory-estimate [--runs N] [--label S] -- <cmd> [args...]\n',
		);
		process.exit(2);
	}
	const { runs, label, cmd } = parsed;
	const [bin, ...rest] = cmd;

	const peaks = [];
	for (let i = 1; i <= runs; i++) {
		process.stderr.write(
			`[memory-estimate] run ${i}/${runs} (${label}) starting...\n`,
		);
		const { peak, code } = await measureOnce(bin, rest);
		process.stderr.write(
			`[memory-estimate] run ${i}/${runs}: peak=${peak}MB exit=${code}\n`,
		);
		if (code !== 0) {
			process.stderr.write(
				`[memory-estimate] aborting: command exited with code ${code}\n`,
			);
			process.exit(code);
		}
		peaks.push(peak);
	}

	if (peaks.length === 1) {
		const recommend = ceilTo50(peaks[0]);
		process.stderr.write(
			`[memory-estimate] summary (${label}): peak=${peaks[0]}MB → recommended --mb ${recommend}\n`,
		);
	} else {
		const s = stats(peaks);
		const recommend = ceilTo50(s.max);
		process.stderr.write(
			`[memory-estimate] summary (${label}): min=${s.min} max=${s.max} mean=${s.mean} p95=${s.p95} MB → recommended --mb ${recommend}\n`,
		);
	}
}

main().catch((err) => {
	process.stderr.write(`[memory-estimate] fatal: ${err?.stack ?? err}\n`);
	process.exit(1);
});
