import type { AssertNoOverlap, Fold, FoldRight } from '@franklin/lib';
import type { CombinedRuntime, RuntimeExtras } from './combine.js';
import type { BaseRuntime } from './types.js';

interface CombineRuntimeFold extends Fold {
	readonly In: readonly [BaseRuntime, BaseRuntime];
	readonly Out: [this['In'][1]] extends [never]
		? never
		: AssertNoOverlap<
					RuntimeExtras<this['In'][0]>,
					RuntimeExtras<this['In'][1]>
			  > extends never
			? never
			: CombinedRuntime<this['In'][0], this['In'][1]>;
}

export type ReduceRuntimes<Runtimes extends readonly BaseRuntime[]> = FoldRight<
	Runtimes,
	BaseRuntime,
	CombineRuntimeFold
>;
