import type { BaseAPI, Signature } from '../api/types.js';
import { deriveApi } from '../extension-points/facade.js';
import type { BaseRuntime } from '../runtime/types.js';
import type { APITransform } from './types.js';

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
	readonly highest: APITransform;
	readonly high: APITransform;
	readonly default: APITransform;
	readonly low: APITransform;
	readonly lowest: APITransform;
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

export const priority = {
	levels: priorityLevels,
	highest: <TAPI extends BaseAPI>(api: TAPI): TAPI =>
		withPriority(priorityLevels.highest, api),
	high: <TAPI extends BaseAPI>(api: TAPI): TAPI =>
		withPriority(priorityLevels.high, api),
	default: <TAPI extends BaseAPI>(api: TAPI): TAPI =>
		withPriority(priorityLevels.default, api),
	low: <TAPI extends BaseAPI>(api: TAPI): TAPI =>
		withPriority(priorityLevels.low, api),
	lowest: <TAPI extends BaseAPI>(api: TAPI): TAPI =>
		withPriority(priorityLevels.lowest, api),
} satisfies PriorityTransform;
