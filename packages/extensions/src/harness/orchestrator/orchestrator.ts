import { compile } from '../../algebra/compiler/index.js';
import { resolveState } from '../state/index.js';
import type { BaseHarnessModule, InferState } from '../modules/index.js';
import { createOrchestratorModule } from './internal/index.js';
import type { RuntimeCollection } from './collection.js';
import type {
	OrchestratorCreateInput,
	OrchestratorHandle,
	OrchestratorModule,
	OrchestratorRuntime,
	RuntimeEntry,
} from './types.js';
import type { InferExtension } from '../modules/infer.js';

type Runtime<M extends BaseHarnessModule> = OrchestratorRuntime<M>;
type State<M extends BaseHarnessModule> = InferState<M>;
type Entry<M extends BaseHarnessModule> = RuntimeEntry<Runtime<M>>;

type OrchestratorOptions<M extends BaseHarnessModule> = {
	readonly module: M;
	readonly collection: RuntimeCollection<OrchestratorRuntime<M>>;
	readonly extension: InferExtension<OrchestratorModule<[M]>>;
	readonly createId?: () => string;
};

export class Orchestrator<
	M extends BaseHarnessModule,
> implements OrchestratorHandle<Runtime<M>, State<M>> {
	private readonly baseModule: M;
	private readonly collection: RuntimeCollection<Runtime<M>>;
	private readonly extension: InferExtension<OrchestratorModule<[M]>>;
	private readonly createId: () => string;

	constructor(opts: OrchestratorOptions<M>) {
		this.baseModule = opts.module;
		this.collection = opts.collection;
		this.extension = opts.extension;
		this.createId = opts.createId ?? (() => crypto.randomUUID());
	}

	async create(input?: OrchestratorCreateInput<State<M>>): Promise<Entry<M>> {
		const id = this.createId();
		return this.materialize(id, await this.createState(input ?? {}));
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
		const fullModule = this.createFullModule(id);
		const compiler = fullModule.createCompiler(state);
		const runtime = await compile(compiler, this.extension);
		this.collection.set(id, runtime);
		return { id, runtime };
	}

	private createFullModule(id: string): OrchestratorModule<[M]> {
		return createOrchestratorModule(this.baseModule, {
			id,
			getHandle: () => this,
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

		return resolveState(state, options.overrides);
	}
}
