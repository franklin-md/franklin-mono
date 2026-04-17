import type { DecodeIssue } from '../codec/types.js';
import type { CorruptJsonIssue, HydrateFailedIssue, Issue } from './types.js';

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

export function corruptJsonIssue(
	path: string,
	err: unknown,
	id?: string,
): CorruptJsonIssue {
	return { kind: 'corrupt-json', path, id, error: errorMessage(err) };
}

export function hydrateFailedIssue(
	id: string,
	err: unknown,
): HydrateFailedIssue {
	return {
		kind: 'hydrate-failed',
		path: `<hydrate:${id}>`,
		id,
		error: errorMessage(err),
	};
}

/** Attaches filesystem context (path, optional id) to a codec decode failure. */
export function issueFromDecode(
	body: DecodeIssue,
	path: string,
	id?: string,
): Issue {
	if (id === undefined) return { ...body, path };
	return { ...body, path, id };
}
