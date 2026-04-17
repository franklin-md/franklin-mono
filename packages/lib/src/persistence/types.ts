import type { Issue } from './issue/types.js';

/**
 * Aggregated result of a restore operation.
 *
 * Currently only issues, but kept as a record so future fields (timings,
 * success counts, etc.) can be added without churning call sites.
 */
export type RestoreResult = {
	issues: Issue[];
};
