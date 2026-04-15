import path from 'node:path';
import type { AbsolutePath } from '@franklin/lib';
import { normalizePath } from 'obsidian';
import type { Vault } from 'obsidian';

import { getVaultAbsolutePath } from '../../utils/obsidian/path.js';
import type { ObsidianPathTarget } from './types.js';

export type ObsidianPathPolicy = {
	classifyPath(absolutePath: AbsolutePath): ObsidianPathTarget;
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
		classifyPath(absolutePath: AbsolutePath): ObsidianPathTarget {
			const normalizedAbsolutePath = path.normalize(absolutePath);
			if (!isWithinRoot(normalizedVaultRoot, normalizedAbsolutePath)) {
				return { kind: 'backup' };
			}

			if (isWithinRoot(normalizedConfigRoot, normalizedAbsolutePath)) {
				return { kind: 'backup' };
			}

			const relativePath = path.relative(
				normalizedVaultRoot,
				normalizedAbsolutePath,
			);

			if (hasHiddenSegment(relativePath)) {
				return { kind: 'backup' };
			}

			return { kind: 'vault' };
		},
	};
}

export function createObsidianPathPolicyFromVault(
	vault: Vault,
): ObsidianPathPolicy {
	return createObsidianPathPolicy(getVaultAbsolutePath(vault), vault.configDir);
}
