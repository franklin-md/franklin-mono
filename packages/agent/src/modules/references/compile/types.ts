import type { BaseRuntime } from '@franklin/extensibility';
import type {
	Reference,
	ReferenceContext,
	ReferenceEngine,
} from '../api/index.js';

export type RegisteredReferenceHandler = {
	toContext(reference: Reference): Promise<ReferenceContext>;
};

export type ReferenceRegistry = ReadonlyMap<string, RegisteredReferenceHandler>;

export type ReferencesRuntime = BaseRuntime & {
	readonly references: ReferenceEngine;
};
