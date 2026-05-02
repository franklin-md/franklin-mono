import { compileAll } from '../../algebra/compiler/index.js';
import type { Extension } from '../../algebra/extension/index.js';
import { resolveState } from '../state/index.js';
import {
	combine,
	combineAll,
	type BaseHarnessModule,
	type InferBoundAPI,
	type InferRuntime,
	type InferState,
	type Modules,
} from '../modules/index.js';
import { createOrchestratorInternalModule } from './internal-module.js';
import type { RuntimeCollection } from './collection.js';
import type {
	OrchestratorCreateInput,
	OrchestratorHandle,
	OrchestratorModule,
	OrchestratorOptions,
	RuntimeEntry,
} from './types.js';

export class Orchestrator<
	Mods extends readonly BaseHarnessModule[],
> implements OrchestratorHandle<
	InferRuntime<OrchestratorModule<Mods>>,
	InferState<OrchestratorModule<Mods>>
> {
	private readonly baseModule: Modules<Mods>;
	private readonly fullModule: OrchestratorModule<Mods>;
	private readonly collection: RuntimeCollection<
		InferRuntime<OrchestratorModule<Mods>>
	>;
	private readonly extensions: Extension<
		InferBoundAPI<OrchestratorModule<Mods>>
	>[];
	private readonly createId: () => string;

	constructor(opts: OrchestratorOptions<Mods>) {
		this.baseModule = combineAll<Mods>(opts.modules);
		this.collection = opts.collection;
		this.extensions = opts.extensions;
		this.createId = opts.createId ?? (() => crypto.randomUUID());
		type Runtime = InferRuntime<OrchestratorModule<Mods>>;
		this.fullModule = combine(
			this.baseModule,
			createOrchestratorInternalModule<Runtime>(
				() => this as unknown as OrchestratorHandle<Runtime>,
			) as never,
		) as unknown as OrchestratorModule<Mods>;
	}

	async create(
		input?: OrchestratorCreateInput<InferState<OrchestratorModule<Mods>>>,
	): Promise<RuntimeEntry<InferRuntime<OrchestratorModule<Mods>>>> {
		const id = this.createId();
		return this.materialize(id, await this.createState(input ?? {}));
	}

	get(
		id: string,
	): RuntimeEntry<InferRuntime<OrchestratorModule<Mods>>> | undefined {
		return this.collection.get(id);
	}

	list(): RuntimeEntry<InferRuntime<OrchestratorModule<Mods>>>[] {
		return this.collection.list();
	}

	remove(id: string): Promise<boolean> {
		return this.collection.remove(id);
	}

	async materialize(
		id: string,
		state: InferState<OrchestratorModule<Mods>>,
	): Promise<RuntimeEntry<InferRuntime<OrchestratorModule<Mods>>>> {
		const compiler = this.fullModule.createCompiler({ id, state });
		const runtime = await compileAll(compiler, this.extensions);
		this.collection.set(id, runtime);
		return { id, runtime };
	}

	private async createState(
		options: OrchestratorCreateInput<InferState<OrchestratorModule<Mods>>>,
	): Promise<InferState<OrchestratorModule<Mods>>> {
		let state: InferState<OrchestratorModule<Mods>>;
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

export function createOrchestrator<Mods extends readonly BaseHarnessModule[]>(
	opts: OrchestratorOptions<Mods>,
): Orchestrator<Mods> {
	return new Orchestrator(opts);
}
