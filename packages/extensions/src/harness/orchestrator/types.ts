import type { DeepPartial } from '@franklin/lib';
import type { BoundAPI } from '../../algebra/api/index.js';
import type {
	BaseRuntime,
	RuntimeExtras,
} from '../../algebra/runtime/index.js';
import type {
	BaseHarnessModule,
	InferAPI,
	InferRuntime,
	InferState,
} from '../modules/index.js';
import type {
	RuntimeCreateInput,
	RuntimeEntry,
	RuntimeOrchestratorPort,
} from '../modules/context.js';
import type { SelfRuntime } from './internal-module.js';
import type { RuntimeCollection } from './collection.js';

export type OrchestratedRuntime<Module extends BaseHarnessModule> =
	BaseRuntime &
		RuntimeExtras<InferRuntime<Module>> &
		SelfRuntime & {
			readonly orchestrator: RuntimeOrchestratorPort<
				OrchestratedRuntime<Module>
			>;
		};

export type OrchestratedAPI<Module extends BaseHarnessModule> = BoundAPI<
	InferAPI<Module>,
	OrchestratedRuntime<Module>
>;

export type OrchestratedExtension<Module extends BaseHarnessModule> = (
	api: OrchestratedAPI<Module>,
) => void;

export type OrchestratorCreateInput<State> = RuntimeCreateInput & {
	readonly overrides?: DeepPartial<State>;
};

export type OrchestratorOptions<Module extends BaseHarnessModule> = {
	readonly module: Module;
	readonly collection: RuntimeCollection<OrchestratedRuntime<Module>>;
	readonly extensions: OrchestratedExtension<Module>[];
	readonly createId?: () => string;
};

export type OrchestratorPort<Module extends BaseHarnessModule> = {
	create(
		input?: OrchestratorCreateInput<InferState<Module>>,
	): Promise<RuntimeEntry<OrchestratedRuntime<Module>>>;
	get(id: string): RuntimeEntry<OrchestratedRuntime<Module>> | undefined;
	list(): RuntimeEntry<OrchestratedRuntime<Module>>[];
	remove(id: string): Promise<boolean>;
	materialize(
		id: string,
		state: InferState<Module>,
	): Promise<RuntimeEntry<OrchestratedRuntime<Module>>>;
};

export type RuntimeEvent<Runtime extends BaseRuntime> =
	| { readonly action: 'add'; readonly id: string; readonly runtime: Runtime }
	| {
			readonly action: 'remove';
			readonly id: string;
			readonly runtime: Runtime;
	  };
