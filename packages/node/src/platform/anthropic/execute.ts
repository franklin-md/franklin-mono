import { SandboxManager } from '@anthropic-ai/sandbox-runtime';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { quote as quoteArgv } from 'shell-quote';
import type { ProcessInput, ProcessOutput } from '@franklin/lib';
import type { SandboxConfig } from './scheduler/types.js';

export async function execute(
	input: ProcessInput,
	config: SandboxConfig,
): Promise<ProcessOutput> {
	const { file, args, cwd, env, timeout } = input;
	const tempDirectory = tmpdir();
	await access(tempDirectory, constants.W_OK);
	try {
		// SandboxManager.wrapWithSandbox takes a shell-string and returns a
		// shell-string (e.g. `sandbox-exec -p <policy> /bin/sh -c "..."`), which
		// must ultimately be run through `shell: true`. We POSIX-quote the argv
		// here so the shell reassembles the exact argv we were given — callers
		// never have to shell-escape themselves.
		// SRT overrides the outer TMPDIR with /tmp/claude, which may not exist.
		// Rebind the existing OS temp directory inside the sandbox; its configured
		// filesystem policy still decides whether the command may write there.
		const shellCmd = quoteArgv([
			'env',
			`TMPDIR=${tempDirectory}`,
			file,
			...(args ?? []),
		]);
		const sandboxedCommand = await SandboxManager.wrapWithSandbox(
			shellCmd,
			undefined,
			config,
		);

		// env merges over process.env so callers can add a few vars without
		// dropping PATH, HOME, etc.
		const mergedEnv = env ? { ...process.env, ...env } : undefined;

		const child = spawn(sandboxedCommand, {
			shell: true,
			stdio: 'pipe',
			cwd,
			env: mergedEnv,
			timeout,
		});

		// Collect output
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

		// Handle exit and cleanup after child process completes
		// An error can precede close. Keep ownership until stdio has closed too.
		let spawnError: Error | undefined;
		child.once('error', (error) => {
			spawnError = error;
		});
		const [code, signal] = await new Promise<
			[number | null, NodeJS.Signals | null]
		>((resolve) => {
			child.once('close', (code, signal) => resolve([code, signal]));
		});
		if (spawnError) throw spawnError;

		return {
			exit_code: code ?? (signal ? 128 : 1),
			stdout: Buffer.concat(stdout).toString(),
			stderr: Buffer.concat(stderr).toString(),
		};
	} finally {
		SandboxManager.cleanupAfterCommand();
	}
}
