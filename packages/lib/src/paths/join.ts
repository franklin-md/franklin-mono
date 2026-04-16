import { join as patheJoin } from 'pathe';

/**
 * Slash-normalizing path join backed by `pathe`.
 *
 * Concatenates segments with `/`, then normalises the result
 * (collapses `//`, resolves `.` and `..`).
 */
export function join(...segments: string[]): string {
	return patheJoin(...segments);
}
