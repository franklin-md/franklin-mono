import { reduceExtensions } from '@franklin/extensibility';
import {
	buildStateExtensionModule,
	type BuildableModule,
	type BuildModules,
	type InferExtension,
	type ValidateBuildModules,
} from '../state/index.js';
import { RuntimeCollection } from './collection.js';
import { Orchestrator } from './orchestrator.js';
import type { OrchestratorModule } from './types.js';

export type CreateOrchestratorInput<Mods extends readonly BuildableModule[]> = {
	readonly modules: readonly [...Mods] & ValidateBuildModules<Mods>;
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
		extension,
		collection: new RuntimeCollection(),
		createId: opts.createId,
	});
}
