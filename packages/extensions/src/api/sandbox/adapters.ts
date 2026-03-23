import type {
	ReadOperations,
	WriteOperations,
	EditOperations,
	BashOperations,
	GrepOperations,
	FindOperations,
	LsOperations,
} from '@mariozechner/pi-coding-agent';
import type { Filesystem, Terminal } from './types.js';

export function toReadOperations(fs: Filesystem): ReadOperations {
	return {
		readFile: (path) => fs.readFile(path),
		access: (path) => fs.access(path),
	};
}

export function toWriteOperations(fs: Filesystem): WriteOperations {
	return {
		writeFile: (path, content) => fs.writeFile(path, content),
		mkdir: (dir) => fs.mkdir(dir, { recursive: true }).then(() => undefined),
	};
}

export function toEditOperations(fs: Filesystem): EditOperations {
	return {
		readFile: (path) => fs.readFile(path),
		writeFile: (path, content) => fs.writeFile(path, content),
		access: (path) => fs.access(path),
	};
}

export function toBashOperations(terminal: Terminal): BashOperations {
	return {
		exec: (command, cwd, options) => terminal.exec(command, cwd, options),
	};
}

export function toGrepOperations(fs: Filesystem): GrepOperations {
	return {
		isDirectory: async (path) => (await fs.stat(path)).isDirectory(),
		readFile: async (path) => (await fs.readFile(path)).toString('utf-8'),
	};
}

export function toFindOperations(fs: Filesystem): FindOperations {
	return {
		exists: (path) => fs.exists(path),
		glob: (pattern, cwd, options) =>
			fs.glob(pattern, {
				cwd,
				ignore: options.ignore,
				limit: options.limit,
			}),
	};
}

export function toLsOperations(fs: Filesystem): LsOperations {
	return {
		exists: (path) => fs.exists(path),
		stat: (path) => fs.stat(path),
		readdir: (path) => fs.readdir(path),
	};
}
