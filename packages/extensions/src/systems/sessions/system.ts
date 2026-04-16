import type { SessionAPI } from './api/api.js';
import type {
	InferAPI,
	InferState,
	RuntimeSystem,
} from '../../algebra/system/types.js';
import type { SessionRuntime } from './runtime/runtime.js';
import type { SessionCreate } from './runtime/types.js';

// A form of composition. Similar to CombineSystems — wraps a base system
// with session capabilities (child/fork). Recursive: child/fork produce
// runtimes that themselves have session capabilities via the manager.
export type SessionSystem<RTS extends RuntimeSystem<any, any, any>> =
	RuntimeSystem<
		InferState<RTS>,
		InferAPI<RTS> & SessionAPI<RTS>,
		SessionRuntime<RTS>
	>;

export function createSessionSystem<RTS extends RuntimeSystem<any, any, any>>(
	system: RTS,
	id: string,
	create: SessionCreate<SessionSystem<RTS>>,
	remove: (id: string) => Promise<boolean>,
): SessionSystem<RTS> {
	return {
		emptyState: () => system.emptyState(),

		async createCompiler(state: InferState<RTS>) {
			const baseCompiler = await system.createCompiler(state);
			const createChild = () => create({ from: id, mode: 'child' });
			const createFork = () => create({ from: id, mode: 'fork' });
			const removeSelf = () => remove(id);

			return {
				api: {
					...baseCompiler.api,
					session: {
						createChild,
						createFork,
						removeSelf,
					},
				},
				async build() {
					const baseRuntime = await baseCompiler.build();
					return {
						...baseRuntime,
						session: {
							child: createChild,
							fork: createFork,
							removeSelf,
						},
					};
				},
			};
		},
	};
}
