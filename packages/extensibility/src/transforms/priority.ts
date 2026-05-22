import type { BaseAPI, Signature } from '../api/types.js';
import type { Extension } from '../extension/types.js';
import { deriveApi } from '../extension-points/facade.js';
import type { BaseRuntime } from '../runtime/types.js';

interface TransformSignature<TAPI extends BaseAPI> extends Signature {
	readonly In: BaseRuntime;
	readonly Out: TAPI;
}

export const priorityLevels = {
	// CodeMirror uses named precedence buckets instead of exposing arbitrary
	// numbers, keeping extension authors out of z-index-style priority wars.
	// See: https://codemirror.net/examples/config/#precedence
	// Source: https://code.haverbeke.berlin/codemirror/state/src/branch/main/src/facet.ts
	highest: Infinity,
	high: 100,
	default: 0,
	low: -100,
	lowest: -Infinity,
} as const;

type PriorityTransform = {
	readonly levels: typeof priorityLevels;
	readonly highest: PriorityBucketTransform;
	readonly high: PriorityBucketTransform;
	readonly default: PriorityBucketTransform;
	readonly low: PriorityBucketTransform;
	readonly lowest: PriorityBucketTransform;
};

type PriorityBucketTransform = {
	<TAPI extends BaseAPI>(extension: Extension<TAPI>): Extension<TAPI>;
	<TAPI extends BaseAPI>(api: TAPI): TAPI;
};

function withPriority<TAPI extends BaseAPI>(value: number, api: TAPI): TAPI {
	return deriveApi<TransformSignature<TAPI>, BaseRuntime>(
		api,
		(write) => (effect) => {
			const prioritized: typeof effect = {
				...effect,
				meta: { ...effect.meta, priority: value },
			};
			write(prioritized);
		},
	);
}

function withExtensionPriority<TAPI extends BaseAPI>(
	value: number,
	extension: Extension<TAPI>,
): Extension<TAPI> {
	return (api) => {
		extension(withPriority(value, api));
	};
}

function createPriorityBucketTransform(value: number): PriorityBucketTransform {
	return ((target: unknown) => {
		if (typeof target === 'function') {
			return withExtensionPriority(value, target as Extension<BaseAPI>);
		}

		return withPriority(value, target as BaseAPI);
	}) as PriorityBucketTransform;
}

export const priority = {
	levels: priorityLevels,
	highest: createPriorityBucketTransform(priorityLevels.highest),
	high: createPriorityBucketTransform(priorityLevels.high),
	default: createPriorityBucketTransform(priorityLevels.default),
	low: createPriorityBucketTransform(priorityLevels.low),
	lowest: createPriorityBucketTransform(priorityLevels.lowest),
} satisfies PriorityTransform;
