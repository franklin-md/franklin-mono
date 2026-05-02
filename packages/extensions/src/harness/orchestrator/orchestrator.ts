import { compileAll } from '../../algebra/compiler/index.js';
import { resolveState } from '../state/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import {
	combine,
	type BaseHarnessModule,
	type InferAPI,
	type InferState,
	type HarnessModule,
} from '../modules/index.js';
import { createHarnessModuleCompilerInput } from '../modules/context.js';
import type {
	OrchestratorCreateInput,
	OrchestratorHandle,
	RuntimeEntry,
} from '../modules/context.js';
import { createOrchestratorInternalModule } from './internal-module.js';
import type {
	OrchestratedRuntime,
	OrchestratorOptions,
} from './types.js';

export class Orchestrator<
	Module extends BaseHarnessModule,
> implements OrchestratorHandle<OrchestratedRuntime<Module>, InferState<Module>> {
	private readonly baseModule: Module;
	private readonly fullModule: HarnessModule<
		InferState<Module>,
		InferAPI<Module>,
		OrchestratedRuntime<Module>
	>;
	private readonly collection: OrchestratorOptions<Module>['collection'];
	private readonly extensions: OrchestratorOptions<Module>['extensions'];
	private readonly createId: () => string;

	constructor(opts: OrchestratorOptions<Module>) {
		this.baseModule = opts.module;
		this.collection = opts.collection;
		this.extensions = opts.extensions;
		this.createId = opts.createId ?? (() => crypto.randomUUID());
		this.fullModule = combine(
			opts.module,
			createOrchestratorInternalModule<OrchestratedRuntime<Module>>() as never,
		) as unknown as HarnessModule<
			InferState<Module>,
			InferAPI<Module>,
			OrchestratedRuntime<Module>
		>;
	}

	async create(
		input?: OrchestratorCreateInput<InferState<Module>>,
	): Promise<RuntimeEntry<OrchestratedRuntime<Module>>> {
		const id = this.createId();
		return this.materialize(id, await this.createState(input ?? {}));
	}

	get(id: string): RuntimeEntry<OrchestratedRuntime<Module>> | undefined {
		return this.collection.get(id);
	}

	list(): RuntimeEntry<OrchestratedRuntime<Module>>[] {
		return this.collection.list();
	}

	remove(id: string): Promise<boolean> {
		return this.collection.remove(id);
	}

	async materialize(
		id: string,
		state: InferState<Module>,
	): Promise<RuntimeEntry<OrchestratedRuntime<Module>>> {
		const compiler = this.fullModule.createCompiler(
			createHarnessModuleCompilerInput(state, {
				id,
				getOrchestrator: <ContextRuntime extends BaseRuntime>() =>
					this as unknown as OrchestratorHandle<ContextRuntime>,
			}),
		);
		const runtime = await compileAll(compiler, this.extensions);
		this.collection.set(id, runtime);
		return { id, runtime };
	}

	private async createState(
		options: OrchestratorCreateInput<InferState<Module>>,
	): Promise<InferState<Module>> {
		let state: InferState<Module>;
		if (options.from) {
			const source = this.collection.get(options.from);
			if (!source) throw new Error(`Runtime ${options.from} not found`);
			const handle = this.baseModule.state(source.runtime);
			state =
				options.mode === 'fork' ? await handle.fork() : await handle.child();
		} else {
			state = this.baseModule.emptyState();
		}

		return resolveState(state, options.overrides);
	}
}

export function createOrchestrator<Module extends BaseHarnessModule>(
	opts: OrchestratorOptions<Module>,
): Orchestrator<Module> {
	return new Orchestrator(opts);
}
