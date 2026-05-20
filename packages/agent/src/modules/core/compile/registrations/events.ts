import type { BaseRuntime, RegistryView } from '@franklin/extensibility';

import type { CoreEventHandlers, CoreSignature } from '../../api/api.js';

export function registeredEventHandlers<
	Runtime extends BaseRuntime,
	Event extends keyof CoreEventHandlers<Runtime>,
>(
	registrations: RegistryView<CoreSignature, Runtime>,
	event: Event,
): CoreEventHandlers<Runtime>[Event][] {
	return registrations
		.argsFor('on')
		.flatMap(([registeredEvent, handler]) =>
			registeredEvent === event
				? [handler as CoreEventHandlers<Runtime>[Event]]
				: [],
		);
}
