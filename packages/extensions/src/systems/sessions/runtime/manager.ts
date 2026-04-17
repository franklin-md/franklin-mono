import type {
	BaseRuntimeSystem,
	InferAPI,
	InferState,
} from '../../../algebra/system/types.js';
import type { SessionAPI } from '../api/api.js';
import type { Extension } from '../../../algebra/types/extension.js';
import type { SessionCollection } from './collection.js';
import type { SessionRuntime } from './runtime.js';
import type { BaseRuntime } from '../../../algebra/runtime/types.js';
import { createSessionSystem, type SessionSystem } from '../system.js';
import { createRuntime } from '../../../algebra/system/create.js';
import { resolveState } from '../../../algebra/state/resolve.js';
import type { Session, SessionCreateInput } from './types.js';

type SessionManagerOptions<RTS extends BaseRuntimeSystem> = {
	system: RTS;
	collection: SessionCollection<SessionRuntime<RTS>>;
	extensions: Extension<InferAPI<RTS> & SessionAPI<RTS>>[];
};

export class SessionManager<RTS extends BaseRuntimeSystem> {
	private readonly system: RTS;
	private readonly collection: SessionCollection<SessionRuntime<RTS>>;
	private readonly extensions: Extension<InferAPI<RTS> & SessionAPI<RTS>>[];

	constructor(opts: SessionManagerOptions<RTS>) {
		this.system = opts.system;
		this.collection = opts.collection;
		this.extensions = opts.extensions;
	}

	async create(
		input?: SessionCreateInput<SessionSystem<RTS>>,
	): Promise<Session<SessionRuntime<RTS>>> {
		const id = crypto.randomUUID();

		const session = await this.materialize(
			id,
			await this.createState(input ?? {}),
		);

		this.collection.set(id, session.runtime);

		return session;
	}

	async remove(id: string) {
		return this.collection.remove(id);
	}

	async materialize(
		id: string,
		state: InferState<RTS>,
	): Promise<Session<SessionRuntime<RTS>>> {
		const fullSystem = createSessionSystem(
			this.system,
			id,
			this.create.bind(this),
			this.remove.bind(this),
		);
		const runtime = await createRuntime(fullSystem, state, this.extensions);
		return { id, runtime };
	}

	private async createState(options: SessionCreateInput<SessionSystem<RTS>>) {
		let state: InferState<RTS>;
		if (options.from) {
			const source = this.collection.get(options.from);
			if (!source) throw new Error(`Session ${options.from} not found`);
			const rt: BaseRuntime<InferState<RTS>> = source.runtime;
			state = options.mode === 'fork' ? await rt.fork() : await rt.child();
		} else {
			state = this.system.emptyState();
		}

		state = resolveState(state, options.overrides);
		return state;
	}
}

export function createSessionManager<RTS extends BaseRuntimeSystem>(
	opts: SessionManagerOptions<RTS>,
): SessionManager<RTS> {
	return new SessionManager(opts);
}
