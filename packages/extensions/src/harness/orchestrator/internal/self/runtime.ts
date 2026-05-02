import type { BaseRuntime } from '../../../../algebra/runtime/index.js';

export type SelfRuntime = BaseRuntime & {
	readonly self: {
		readonly id: string;
	};
};
