import { compile } from '@franklin/extensibility';
import type {
	BaseStateExtensionModule,
	InferExtension,
	InferState,
} from '../state/index.js';
import { resolveState } from '../state/index.js';
import { createOrchestratorModule } from './internal/index.js';
import type { RuntimeCollection } from './collection.js';
import type {
	OrchestratorCreateInput,
	OrchestratorHandle,
	OrchestratorModule,
	OrchestratorRuntime,
	RuntimeEntry,
} from './types.js';

type Runtime<M extends BaseStateExtensionModule> = OrchestratorRuntime<M>;
type State<M extends BaseStateExtensionModule> = InferState<M>;
type Entry<M extends BaseStateExtensionModule> = RuntimeEntry<Runtime<M>>;

type OrchestratorOptions<M extends BaseStateExtensionModule> = {
	readonly module: M;
	readonly collection: RuntimeCollection<OrchestratorRuntime<M>>;
	readonly extension: InferExtension<OrchestratorModule<[M]>>;
	readonly createId?: () => string;
};

export class Orchestrator<
	M extends BaseStateExtensionModule,
> implements OrchestratorHandle<Runtime<M>, State<M>> {
	private readonly baseModule: M;
	private readonly collection: RuntimeCollection<Runtime<M>>;
	private readonly extension: InferExtension<OrchestratorModule<[M]>>;
	private readonly createId: () => string;
	private readonly runtimeHandle: OrchestratorHandle<Runtime<M>, State<M>>;

	constructor(opts: OrchestratorOptions<M>) {
		this.baseModule = opts.module;
		this.collection = opts.collection;
		this.extension = opts.extension;
		this.createId = opts.createId ?? (() => crypto.randomUUID());
		this.runtimeHandle = {
			create: (input) => this.create(input),
			get: (id) => this.get(id),
			list: () => this.list(),
			remove: (id) => this.remove(id),
		};
	}

	async create(input?: OrchestratorCreateInput<State<M>>): Promise<Entry<M>> {
		const options = input ?? {};
		const id = options.id ?? this.createId();
		if (this.collection.has(id)) {
			throw new Error(`Runtime ${id} already exists`);
		}

		return this.createRuntime(id, await this.createState(options));
	}

	get(id: string): Entry<M> | undefined {
		return this.collection.get(id);
	}

	list(): Entry<M>[] {
		return this.collection.list();
	}

	remove(id: string): Promise<boolean> {
		return this.collection.remove(id);
	}

	async materialize(id: string, state: State<M>): Promise<Entry<M>> {
		if (this.collection.has(id)) {
			throw new Error(`Runtime ${id} already exists`);
		}

		return this.createRuntime(id, state);
	}

	private async createRuntime(id: string, state: State<M>): Promise<Entry<M>> {
		const fullModule = this.createFullModule(id);
		const simple = fullModule.instantiate(state);
		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			this.extension,
		);
		this.collection.set(id, runtime);
		return { id, runtime };
	}

	private createFullModule(id: string): OrchestratorModule<[M]> {
		return createOrchestratorModule(this.baseModule, {
			id,
			getHandle: () => this.runtimeHandle,
		});
	}

	private async createState(
		options: OrchestratorCreateInput<State<M>>,
	): Promise<State<M>> {
		let state: State<M>;
		if (options.from) {
			const source = this.collection.get(options.from);
			if (!source) throw new Error(`Runtime ${options.from} not found`);
			const handle = this.baseModule.state(source.runtime as never);
			state =
				options.mode === 'fork' ? await handle.fork() : await handle.child();
		} else {
			state = this.baseModule.emptyState();
		}

		return resolveState(state, options.state);
	}
}
