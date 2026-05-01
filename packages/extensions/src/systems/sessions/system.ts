import type { Compiler } from '../../algebra/compiler/index.js';
import type {
	BaseRuntimeSystem,
	InferAPI,
	InferRuntime,
	InferState,
	RuntimeSystem,
} from '../../algebra/system/index.js';
import type { SessionRuntime } from './runtime/runtime.js';
import type { SessionCreate } from './runtime/types.js';

/**
 * SessionSystem wraps a base system, contributing session ops
 * (`child`, `fork`, `removeSelf`) into the runtime only — never on the
 * compile-time api. Extensions reach session ops via
 * `ctx.runtime.session.*` from inside handler closures. State projection
 * delegates straight through to the base system; the `session` extra
 * carries no persisted state of its own.
 */
export type SessionSystem<RTS extends BaseRuntimeSystem> = RuntimeSystem<
	InferState<RTS>,
	InferAPI<RTS>,
	SessionRuntime<RTS>
>;

export function createSessionSystem<RTS extends BaseRuntimeSystem>(
	system: RTS,
	id: string,
	create: SessionCreate<SessionSystem<RTS>>,
	remove: (id: string) => Promise<boolean>,
): SessionSystem<RTS> {
	return {
		emptyState: () => system.emptyState(),

		state: (runtime) => system.state(runtime),

		createCompiler(
			state: InferState<RTS>,
		): Compiler<InferAPI<RTS>, SessionRuntime<RTS>> {
			const baseCompiler = system.createCompiler(state);
			const sessionOps = {
				child: () => create({ from: id, mode: 'child' }),
				fork: () => create({ from: id, mode: 'fork' }),
				removeSelf: () => remove(id),
			};

			return {
				createApi: () => baseCompiler.createApi() as never,
				build: async (getRuntime) => {
					const baseRuntime = await baseCompiler.build(
						getRuntime as unknown as () => InferRuntime<RTS>,
					);
					return {
						...baseRuntime,
						session: sessionOps,
					};
				},
			};
		},
	};
}
