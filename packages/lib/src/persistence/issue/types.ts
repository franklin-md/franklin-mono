/**
 * Non-fatal problems encountered while loading persisted data.
 *
 * Persisters return issues alongside whatever data was recoverable so
 * callers can surface them without halting startup.
 */

export type CorruptJsonIssue = {
	kind: 'corrupt-json';
	path: string;
	id?: string;
	error: string;
};

export type EnvelopeInvalidIssue = {
	kind: 'envelope-invalid';
	path: string;
	id?: string;
	error: string;
};

export type VersionAheadIssue = {
	kind: 'version-ahead';
	path: string;
	id?: string;
	version: number;
	currentVersion: number;
};

export type MissingMigrationIssue = {
	kind: 'missing-migration';
	path: string;
	id?: string;
	version: number;
};

export type SchemaMismatchIssue = {
	kind: 'schema-mismatch';
	path: string;
	id?: string;
	version: number;
	error: string;
};

export type HydrateFailedIssue = {
	kind: 'hydrate-failed';
	path: string;
	id: string;
	error: string;
};

export type Issue =
	| CorruptJsonIssue
	| EnvelopeInvalidIssue
	| VersionAheadIssue
	| MissingMigrationIssue
	| SchemaMismatchIssue
	| HydrateFailedIssue;
