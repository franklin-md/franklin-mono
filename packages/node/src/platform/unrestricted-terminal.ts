import { spawn } from 'child_process';
import type { Terminal, TerminalInput } from '@franklin/lib';
import { once } from 'events';

/**
 * A Terminal implementation with no sandbox restrictions.
 * Executes commands directly via child_process.spawn.
 */
export class UnrestrictedTerminal implements Terminal {
	private _cwd: string;

	constructor(cwd: string) {
		this._cwd = cwd;
	}

	setCwd(cwd: string) {
		this._cwd = cwd;
	}

	async exec({ cmd, timeout }: TerminalInput) {
		const child = spawn(cmd, {
			shell: true,
			stdio: 'pipe',
			cwd: this._cwd,
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
