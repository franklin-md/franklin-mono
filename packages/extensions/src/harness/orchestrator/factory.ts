import { reduceExtensions } from '../../algebra/extension/index.js';
import {
	combineAll,
	type BaseHarnessModule,
	type Modules,
	type ValidateModules,
} from '../modules/index.js';
import type { InferExtension } from '../modules/infer.js';
import type { RuntimeCollection } from './collection.js';
import { Orchestrator } from './orchestrator.js';
import type { OrchestratorModule, OrchestratorRuntime } from './types.js';

export type CreateOrchestratorInput<Mods extends readonly BaseHarnessModule[]> =
	{
		readonly modules: readonly [...Mods] & ValidateModules<Mods>;
		readonly collection: RuntimeCollection<OrchestratorRuntime<Modules<Mods>>>;
		readonly extensions: InferExtension<OrchestratorModule<Mods>>[];
		readonly createId?: () => string;
	};

export function createOrchestrator<Mods extends readonly BaseHarnessModule[]>(
	opts: CreateOrchestratorInput<Mods>,
): Orchestrator<Modules<Mods>> {
	const module = combineAll<Mods>(opts.modules);
	const extension = reduceExtensions(...opts.extensions);
	return new Orchestrator<Modules<Mods>>({
		module,
		extension,
		collection: opts.collection,
		createId: opts.createId,
	});
}
