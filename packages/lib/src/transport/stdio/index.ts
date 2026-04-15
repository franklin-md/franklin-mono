import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import type { Duplex } from '../streams/types.js';
import type { StdioPipeOptions } from './types.js';

export type { StdioPipeOptions } from './types.js';

export class StdioPipe implements Duplex<Uint8Array> {
	private readonly process: ReturnType<typeof spawn>;

	readonly readable: ReadableStream<Uint8Array>;
	readonly writable: WritableStream<Uint8Array>;

	// TODO: Should we just have a factory instead?
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

		this.readable = readable;
		this.writable = writable;
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
