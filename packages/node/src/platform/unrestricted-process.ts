import { spawn } from 'child_process';
import type { Process, ProcessInput } from '@franklin/lib';
import { once } from 'events';

/**
 * A Process implementation with no sandbox restrictions.
 * Spawns the given executable with argv directly via child_process.spawn,
 * with shell: false so callers are never responsible for shell-escaping.
 */
export class UnrestrictedProcess implements Process {
	private _cwd: string;

	constructor(cwd: string) {
		this._cwd = cwd;
	}

	// Retained for parity with SandboxedProcess.setFilesystemConfig; currently
	// unused in-repo but kept so future callers that need to rebase cwd without
	// rebuilding the instance have a symmetric API.
	setCwd(cwd: string) {
		this._cwd = cwd;
	}

	async exec({ file, args, cwd, env, timeout }: ProcessInput) {
		// env merges over process.env so callers can add a few vars without
		// dropping PATH, HOME, etc.
		const mergedEnv = env ? { ...process.env, ...env } : undefined;

		const child = spawn(file, args ?? [], {
			shell: false,
			stdio: 'pipe',
			cwd: cwd ?? this._cwd,
			env: mergedEnv,
			timeout,
		});

		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

		const [code] = await once(child, 'exit');

		return {
			exit_code: code as number,
			stdout: Buffer.concat(stdout).toString(),
			stderr: Buffer.concat(stderr).toString(),
		};
	}
}
