/**
 * The failure part of a codec `decode`. Persisters augment these with
 * filesystem context (path, id) when they bubble them up as `Issue`s.
 */
export type DecodeIssue =
	| { kind: 'envelope-invalid'; error: string }
	| { kind: 'version-ahead'; version: number; currentVersion: number }
	| { kind: 'missing-migration'; version: number }
	| { kind: 'schema-mismatch'; version: number; error: string };

export type DecodeResult<T> =
	| { ok: true; value: T }
	| { ok: false; issue: DecodeIssue };

export interface Codec<T> {
	encode(value: T): unknown;
	decode(raw: unknown): DecodeResult<T>;
}
