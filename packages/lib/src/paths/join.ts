import { join } from 'pathe';

/**
 * Pure posix-style path join backed by `pathe`.
 *
 * Concatenates segments with `/`, then normalises the result
 * (collapses `//`, resolves `.` and `..`).
 */
export function posixJoin(...segments: string[]): string {
	return join(...segments);
}
