import { compileAll } from '../../algebra/compiler/index.js';
import type { Extension } from '../../algebra/extension/index.js';
import { resolveState } from '../state/index.js';
import {
	combine,
	combineAll,
	type BaseHarnessModule,
	type InferBoundAPI,
	type InferState,
	type Modules,
	type ValidateModules,
} from '../modules/index.js';
import {
	createOrchestrationModule,
	createSelfModule,
} from './internal/index.js';
import type { RuntimeCollection } from './collection.js';
import type {
	OrchestratorCreateInput,
	OrchestratorHandle,
	OrchestratorModule,
	OrchestratorOptions,
	OrchestratorRuntime,
	RuntimeEntry,
} from './types.js';
import type { InferExtension } from '../modules/infer.js';

type Runtime<M extends BaseHarnessModule> = OrchestratorRuntime<M>;
type State<M extends BaseHarnessModule> = InferState<M>;
type Entry<M extends BaseHarnessModule> = RuntimeEntry<Runtime<M>>;

export class Orchestrator<
	M extends BaseHarnessModule,
> implements OrchestratorHandle<Runtime<M>, State<M>> {
	private readonly baseModule: M;
	// `baseModule` combined with the orchestration port; per-instance `self`
	// is the only thing left to bind at materialize-time.
	private readonly modulesMinusSelf: OrchestratorModule<M>;
	private readonly collection: RuntimeCollection<Runtime<M>>;
	private readonly extensions: Extension<
		InferBoundAPI<OrchestratorModule<M>>
	>[];
	private readonly createId: () => string;

	constructor(opts: OrchestratorOptions<M>) {
		this.baseModule = opts.module;
		this.collection = opts.collection;
		this.extensions = opts.extensions;
		this.createId = opts.createId ?? (() => crypto.randomUUID());
		this.modulesMinusSelf = combine(
			this.baseModule,
			createOrchestrationModule<Runtime<M>>(
				() => this as unknown as OrchestratorHandle<Runtime<M>>,
			) as never,
		) as unknown as OrchestratorModule<M>;
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
		const fullModule = combine(
			this.modulesMinusSelf,
			createSelfModule(id) as never,
		) as unknown as OrchestratorModule<M>;
		const compiler = fullModule.createCompiler(state);
		const runtime = await compileAll(compiler, this.extensions);
		this.collection.set(id, runtime);
		return { id, runtime };
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

export type CreateOrchestratorInput<Mods extends readonly BaseHarnessModule[]> =
	{
		readonly modules: readonly [...Mods] & ValidateModules<Mods>;
		readonly collection: RuntimeCollection<OrchestratorRuntime<Modules<Mods>>>;
		readonly extensions: InferExtension<OrchestratorModule<Modules<Mods>>>[];
		readonly createId?: () => string;
	};

export function createOrchestrator<Mods extends readonly BaseHarnessModule[]>(
	opts: CreateOrchestratorInput<Mods>,
): Orchestrator<Modules<Mods>> {
	const module = combineAll<Mods>(opts.modules);
	return new Orchestrator<Modules<Mods>>({
		module,
		collection: opts.collection,
		extensions: opts.extensions,
		createId: opts.createId,
	});
}
