import type { BaseAPI, Signature } from '../api/types.js';
import { deriveApi } from '../extension-points/facade.js';
import type { BaseRuntime } from '../runtime/types.js';
import type { APITransform } from './types.js';

interface TransformSignature<Surface extends BaseAPI> extends Signature {
	readonly In: BaseRuntime;
	readonly Out: Surface;
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

function withPriority<Surface extends BaseAPI>(
	value: number,
	api: Surface,
): Surface {
	return deriveApi<TransformSignature<Surface>, BaseRuntime>(
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
	highest<Surface extends BaseAPI>(api: Surface): Surface {
		return withPriority(priorityLevels.highest, api);
	},
	high<Surface extends BaseAPI>(api: Surface): Surface {
		return withPriority(priorityLevels.high, api);
	},
	default<Surface extends BaseAPI>(api: Surface): Surface {
		return withPriority(priorityLevels.default, api);
	},
	low<Surface extends BaseAPI>(api: Surface): Surface {
		return withPriority(priorityLevels.low, api);
	},
	lowest<Surface extends BaseAPI>(api: Surface): Surface {
		return withPriority(priorityLevels.lowest, api);
	},
} satisfies PriorityTransform;
