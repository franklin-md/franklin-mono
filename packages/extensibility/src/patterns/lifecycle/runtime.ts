import type { BaseRuntime } from '../../runtime/types.js';
import type { LifecycleUnload } from './types.js';

export type LifecycleRuntime = BaseRuntime;

export function createLifecycleRuntime(
	unloads: readonly LifecycleUnload[],
): LifecycleRuntime {
	return {
		async dispose(): Promise<void> {
			const errors: unknown[] = [];

			for (const unload of unloads) {
				try {
					await unload();
				} catch (error) {
					errors.push(error);
				}
			}

			if (errors.length === 1) throw errors[0];
			if (errors.length > 1) {
				throw new AggregateError(errors, 'Lifecycle unload handlers failed');
			}
		},
	};
}
