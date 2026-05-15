import { reduceExtensions } from '../../algebra/extension/index.js';
import {
	buildStateExtensionModule,
	type BuildableModule,
	type BuildModules,
	type InferExtension,
	type ValidateBuildModules,
} from '../../algebra/modules/state/index.js';
import type { RuntimeCollection } from './collection.js';
import { Orchestrator } from './orchestrator.js';
import type { OrchestratorModule, OrchestratorRuntime } from './types.js';

export type CreateOrchestratorInput<Mods extends readonly BuildableModule[]> = {
	readonly modules: readonly [...Mods] & ValidateBuildModules<Mods>;
	readonly collection: RuntimeCollection<
		OrchestratorRuntime<BuildModules<Mods>>
	>;
	readonly extensions: InferExtension<OrchestratorModule<Mods>>[];
	readonly createId?: () => string;
};

export function createOrchestrator<Mods extends readonly BuildableModule[]>(
	opts: CreateOrchestratorInput<Mods>,
): Orchestrator<BuildModules<Mods>> {
	const module = buildStateExtensionModule<Mods>(opts.modules);
	const extension = reduceExtensions(...opts.extensions);
	return new Orchestrator<BuildModules<Mods>>({
		module,
		extension: extension as InferExtension<
			OrchestratorModule<[BuildModules<Mods>]>
		>,
		collection: opts.collection,
		createId: opts.createId,
	});
}
