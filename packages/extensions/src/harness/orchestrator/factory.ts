import { reduceExtensions } from '../../algebra/extension/index.js';
import {
	buildStateExtensionModule,
	type InferExtension,
	type Modules,
	type ValidateModules,
} from '../../algebra/modules/state/index.js';
import type { BaseHarnessModule } from '../modules/module.js';
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
	const module = buildStateExtensionModule<Mods>(opts.modules);
	const extension = reduceExtensions(...opts.extensions);
	return new Orchestrator<Modules<Mods>>({
		module,
		extension,
		collection: opts.collection,
		createId: opts.createId,
	});
}
