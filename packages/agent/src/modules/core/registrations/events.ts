import {
	bindAllWithRuntime,
	type BaseRuntime,
	type RegistryView,
	type WithRuntime,
} from '@franklin/extensibility';

import type { CoreEventHandlerMap, CoreSignature } from '../api/api.js';

function registeredEventHandlers<
	Runtime extends BaseRuntime,
	Event extends keyof CoreEventHandlerMap,
>(
	registrations: RegistryView<CoreSignature, Runtime>,
	event: Event,
): WithRuntime<CoreEventHandlerMap[Event], Runtime>[] {
	return registrations
		.argsFor('on')
		.flatMap(([registeredEvent, handler]) =>
			registeredEvent === event
				? [handler as WithRuntime<CoreEventHandlerMap[Event], Runtime>]
				: [],
		);
}

export function bindRegisteredEventHandlers<
	Runtime extends BaseRuntime,
	Event extends keyof CoreEventHandlerMap,
>(
	registrations: RegistryView<CoreSignature, Runtime>,
	event: Event,
	getRuntime: () => Runtime,
): CoreEventHandlerMap[Event][] {
	return bindAllWithRuntime(
		registeredEventHandlers(registrations, event),
		getRuntime,
	);
}
