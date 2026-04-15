import path from 'node:path';
import { normalizePath } from 'obsidian';
import type { Vault } from 'obsidian';

import { getVaultAbsolutePath } from '../../utils/obsidian/path.js';
import type { ObsidianPathTarget } from './types';

export type ObsidianPathPolicy = {
	classifyPath(absolutePath: string): ObsidianPathTarget;
};

function isWithinRoot(root: string, candidate: string): boolean {
	const relative = path.relative(root, candidate);
	return (
		relative === '' ||
		(!relative.startsWith('..') && !path.isAbsolute(relative))
	);
}

function hasHiddenSegment(relativePath: string): boolean {
	return relativePath
		.split(/[\\/]+/)
		.some((segment) => segment.length > 0 && segment.startsWith('.'));
}

export function createObsidianPathPolicy(
	vaultRoot: string,
	configDir: string,
): ObsidianPathPolicy {
	const normalizedVaultRoot = path.normalize(vaultRoot);
	const normalizedConfigRoot = path.resolve(
		normalizedVaultRoot,
		normalizePath(configDir),
	);

	return {
		classifyPath(absolutePath: string): ObsidianPathTarget {
			if (!path.isAbsolute(absolutePath)) {
				return { kind: 'backup', path: absolutePath };
			}

			const normalizedAbsolutePath = path.normalize(absolutePath);
			if (!isWithinRoot(normalizedVaultRoot, normalizedAbsolutePath)) {
				return { kind: 'backup', path: normalizedAbsolutePath };
			}

			if (isWithinRoot(normalizedConfigRoot, normalizedAbsolutePath)) {
				return { kind: 'backup', path: normalizedAbsolutePath };
			}

			const relativePath = path.relative(
				normalizedVaultRoot,
				normalizedAbsolutePath,
			);
			if (relativePath === '') {
				return { kind: 'vault', path: '' };
			}

			if (hasHiddenSegment(relativePath)) {
				return { kind: 'backup', path: normalizedAbsolutePath };
			}

			return {
				kind: 'vault',
				path: normalizePath(relativePath),
			};
		},
	};
}

export function createObsidianPathPolicyFromVault(
	vault: Vault,
): ObsidianPathPolicy {
	return createObsidianPathPolicy(getVaultAbsolutePath(vault), vault.configDir);
}
