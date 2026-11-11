import type { BaseRuntime, RegistryView } from '@franklin/extensibility';

import type { ToolSource } from '../api/tool-source.js';
import type { CoreEventHandlerMap, CoreSignature } from '../api/api.js';
import { bindRegisteredEventHandlers } from './events.js';
import { bindTools, type BoundTool } from './tools.js';

export type CoreRegistry = {
	readonly tools: readonly BoundTool[];
	readonly toolSources: readonly (() => ToolSource)[];
	handlersFor<Event extends keyof CoreEventHandlerMap>(
		event: Event,
	): CoreEventHandlerMap[Event][];
};

export function createCoreRegistry<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): CoreRegistry {
	return {
		tools: bindTools(registrations, getRuntime),
		toolSources: registrations.argsFor('registerToolSource').map(
			([factory]) =>
				() =>
					factory(getRuntime()),
		),
		handlersFor(event) {
			return bindRegisteredEventHandlers(registrations, event, getRuntime);
		},
	};
}
