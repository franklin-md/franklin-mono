import type { Context, ContextPatch } from '@franklin/mini-acp';

export const contextFields = [
	'systemPrompt',
	'messages',
	'tools',
	'config',
] as const satisfies readonly (keyof Context)[];

export type ContextField = (typeof contextFields)[number];

export type ContextRevisions = Record<ContextField, string>;

export function fieldsInPatch(patch: ContextPatch): ContextField[] {
	return contextFields.filter((field) => patch[field] !== undefined);
}

export function isEmptyPatch(patch: ContextPatch): boolean {
	return fieldsInPatch(patch).length === 0;
}
