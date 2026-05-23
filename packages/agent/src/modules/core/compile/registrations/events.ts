import {
	bindAllWithRuntime,
	type BaseRuntime,
	type RegistryView,
	type WithRuntime,
} from '@franklin/extensibility';

import type { CoreEventHandlerMap, CoreSignature } from '../../api/api.js';

export type CoreEventRegistrations = {
	handlersFor<Event extends keyof CoreEventHandlerMap>(
		event: Event,
	): CoreEventHandlerMap[Event][];
};

export function createCoreEventRegistrations<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): CoreEventRegistrations {
	return {
		handlersFor(event) {
			return bindRegisteredEventHandlers(registrations, event, getRuntime);
		},
	};
}

export function registeredEventHandlers<
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
