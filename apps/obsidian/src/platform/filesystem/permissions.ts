import os from 'node:os';
import path from 'node:path';
import type { AbsolutePath, FilesystemPermissions } from '@franklin/lib';
import { normalizePath } from 'obsidian';

function toPermissionPath(absolutePath: string): string {
	const normalized = normalizePath(absolutePath);
	return normalized.startsWith('/') ? normalized.slice(1) : normalized;
}

function toSubtreePatterns(absolutePath: string): [string, string] {
	const target = toPermissionPath(absolutePath);
	return [target, `${target}/**`];
}

export function createDefaultObsidianFilesystemPermissions(
	vaultRoot: AbsolutePath,
	configDir: string,
	tempRoot = os.tmpdir(),
): FilesystemPermissions {
	const configRoot = path.posix.resolve(vaultRoot, normalizePath(configDir));

	return {
		allowRead: [],
		denyRead: ['**/.env', '**/.env.*', ...toSubtreePatterns(configRoot)],
		allowWrite: [
			...new Set([
				...toSubtreePatterns(vaultRoot),
				...toSubtreePatterns(tempRoot),
			]),
		],
		denyWrite: [...toSubtreePatterns(configRoot)],
	};
}
