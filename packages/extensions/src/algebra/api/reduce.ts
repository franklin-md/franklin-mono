import type { Fold, FoldRight } from '@franklin/lib';
import type { API, ComposeAPI, StaticAPI } from './types.js';

interface ComposeAPIFold extends Fold {
	readonly In: readonly [API, API];
	readonly Out: ComposeAPI<this['In'][0], this['In'][1]>;
}

export type ReduceAPIs<APIs extends readonly API[]> = FoldRight<
	APIs,
	StaticAPI<Record<never, never>>,
	ComposeAPIFold
>;
