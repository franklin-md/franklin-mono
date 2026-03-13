import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';

import type { Pipe } from '../pipe.js';

export interface StdioPipeOptions {
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
}

export class StdioPipe {
	readonly pipe: Pipe;
	private readonly process: ReturnType<typeof spawn>;

	constructor(options: StdioPipeOptions) {
		this.process = spawn(options.command, options.args ?? [], {
			stdio: ['pipe', 'pipe', 'inherit'],
			cwd: options.cwd,
			env: options.env ? { ...process.env, ...options.env } : undefined,
		});

		if (!this.process.stdin || !this.process.stdout) {
			throw new Error('stdin/stdout not available — stdio must be set to pipe');
		}

		const writable = Writable.toWeb(
			this.process.stdin,
		) as WritableStream<Uint8Array>;
		const readable = Readable.toWeb(
			this.process.stdout,
		) as ReadableStream<Uint8Array>;

		this.pipe = { readable, writable };
	}

	async dispose(): Promise<void> {
		if (this.process.exitCode !== null || this.process.killed) return;

		const exited = new Promise<void>((resolve) => {
			this.process.on('exit', () => resolve());
		});
		this.process.kill();
		await exited;
	}
}
