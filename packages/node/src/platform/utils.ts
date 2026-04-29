import type { AbsolutePath } from '@franklin/lib';

export function pathIncludes(str: AbsolutePath): boolean {
	if (process.env.PATH) {
		return (
			process.env.PATH.includes(`:${str}`) ||
			process.env.PATH.includes(`${str}:`)
		);
	}
	return false;
}

export function addToPath(str: AbsolutePath) {
	if (process.env.PATH) {
		process.env.PATH += `:${str}`;
		return;
	}

	process.env.PATH = str;
}

export function withTrailingSlash(path: string): string {
	return path.endsWith('/') ? path : `${path}/`;
}
