import { spawn } from 'node:child_process';
import type { ProcessInput, ProcessOutput } from '@franklin/lib';

export async function run(
	sandboxedCommand: string,
	input: ProcessInput,
): Promise<ProcessOutput> {
	const { cwd, env, timeout } = input;
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

	// An error can precede close. Keep ownership until stdio has closed too;
	// the executor may only clean up after this function settles.
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
}
