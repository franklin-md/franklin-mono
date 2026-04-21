import type { ShellFamily } from './types.js';

/**
 * Deduce the shell family from a shell path's basename.
 *
 * Accepts both POSIX and Windows separators, strips `.exe`, lowercases.
 * Unknown shells fall back to `'posix'` — the safer default for most
 * Unix-like environments where the agent is likely running.
 */
export function detectShellFamily(path: string): ShellFamily {
	const normalized = path.replace(/\\/g, '/');
	const basename = normalized.slice(normalized.lastIndexOf('/') + 1);
	const base = basename.toLowerCase().replace(/\.exe$/, '');

	switch (base) {
		case 'pwsh':
		case 'powershell':
			return 'powershell';
		case 'cmd':
			return 'cmd';
		case 'fish':
			return 'fish';
		default:
			return 'posix';
	}
}
