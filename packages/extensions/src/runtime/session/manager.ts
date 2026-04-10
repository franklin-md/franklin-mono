import type {
	InferAPI,
	InferState,
	RuntimeSystem,
} from '../../runtime-system/types.js';
import type { SessionAPI } from '../../api/session/api.js';
import type { Extension } from '../../types/extension.js';
import type { SessionCollection } from './collection.js';
import type { SessionRuntime } from './runtime.js';
import type { RuntimeBase } from '../types.js';
import {
	createSessionSystem,
	type SessionSystem,
} from '../../runtime-system/session.js';
import { createRuntime } from '../../runtime-system/create.js';
import { resolveState } from '../../runtime-system/resolve.js';
import type { Session, SessionCreate, SessionCreateInput } from './types.js';

type SessionManagerOptions<RTS extends RuntimeSystem<any, any, any>> = {
	system: RTS;
	collection: SessionCollection<SessionRuntime<RTS>>;
	extensions: Extension<InferAPI<RTS> & SessionAPI<RTS>>[];
};

export class SessionManager<RTS extends RuntimeSystem<any, any, any>> {
	readonly create: SessionCreate<RTS>;

	private readonly system: RTS;
	private readonly collection: SessionCollection<SessionRuntime<RTS>>;
	private readonly extensions: Extension<InferAPI<RTS> & SessionAPI<RTS>>[];

	constructor(opts: SessionManagerOptions<RTS>) {
		this.system = opts.system;
		this.collection = opts.collection;
		this.extensions = opts.extensions;

		this.create = async (
			input?: SessionCreateInput<SessionSystem<RTS>>,
		): Promise<Session<SessionRuntime<RTS>>> => {
			const id = crypto.randomUUID();

			let state: InferState<RTS>;
			if (input?.from) {
				const source = this.collection.get(input.from);
				if (!source) throw new Error(`Session ${input.from} not found`);
				const rt: RuntimeBase<InferState<RTS>> = source.runtime;
				state = input.mode === 'fork' ? await rt.fork() : await rt.child();
			} else {
				state = this.system.emptyState();
			}

			state = resolveState(state, input?.overrides);

			const session = await this.realize(id, state);
			this.collection.set(id, session.runtime);
			return session;
		};
	}

	async realize(
		id: string,
		state: InferState<RTS>,
	): Promise<Session<SessionRuntime<RTS>>> {
		const fullSystem = createSessionSystem(this.system, id, this.create);
		const runtime = await createRuntime(fullSystem, state, this.extensions);
		return { id, runtime };
	}
}

export function createSessionManager<RTS extends RuntimeSystem<any, any, any>>(
	opts: SessionManagerOptions<RTS>,
): SessionManager<RTS> {
	return new SessionManager(opts);
}
