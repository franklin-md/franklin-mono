import * as fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { glob as fastGlob } from 'glob';
import type { Sandbox, Filesystem, Terminal } from './types.js';

function createLocalFilesystem(): Filesystem {
	return {
		readFile: (path) => fs.readFile(path),
		writeFile: (path, content) => fs.writeFile(path, content),
		mkdir: (path, options) => fs.mkdir(path, options).then(() => undefined),
		access: (path) => fs.access(path),
		async stat(path) {
			const s = await fs.stat(path);
			return {
				isFile: () => s.isFile(),
				isDirectory: () => s.isDirectory(),
			};
		},
		readdir: (path) => fs.readdir(path),
		async exists(path) {
			try {
				await fs.access(path);
				return true;
			} catch {
				return false;
			}
		},
		async glob(pattern, options) {
			return fastGlob(pattern, {
				cwd: options.cwd,
				ignore: options.ignore,
				maxDepth: undefined,
			}).then((results) =>
				options.limit ? results.slice(0, options.limit) : results,
			);
		},
	};
}

function createLocalTerminal(): Terminal {
	return {
		exec(command, cwd, options) {
			return new Promise((resolve, reject) => {
				const child = spawn(command, {
					cwd,
					shell: true,
					stdio: ['ignore', 'pipe', 'pipe'],
					env: options.env ?? process.env,
					detached: true,
				});

				let timeoutId: ReturnType<typeof setTimeout> | undefined;

				if (options.signal) {
					options.signal.addEventListener('abort', () => {
						child.kill('SIGTERM');
					});
				}

				if (options.timeout) {
					timeoutId = setTimeout(() => {
						child.kill('SIGTERM');
					}, options.timeout * 1000);
				}

				child.stdout.on('data', (data: Buffer) => {
					options.onData(data);
				});
				child.stderr.on('data', (data: Buffer) => {
					options.onData(data);
				});

				child.on('error', (err) => {
					if (timeoutId) clearTimeout(timeoutId);
					reject(err);
				});

				child.on('close', (code) => {
					if (timeoutId) clearTimeout(timeoutId);
					resolve({ exitCode: code });
				});
			});
		},
	};
}

export function createLocalSandbox(options: { cwd: string }): Sandbox {
	return {
		cwd: options.cwd,
		fs: createLocalFilesystem(),
		terminal: createLocalTerminal(),
	};
}
