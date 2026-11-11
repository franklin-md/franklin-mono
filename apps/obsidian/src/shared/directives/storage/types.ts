import type { JsonValue } from '@franklin/lib';

export type DirectiveRecord = { name: string; state: JsonValue };
export type DirectiveDocument = {
	version: 1;
	instances: Record<string, DirectiveRecord>;
};
