import {
	defineExtension,
	type ExtensionForModules,
} from '../../modules/state/index.js';
import type { ReferenceHandler } from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';

export function referenceHandlerExtension(
	...handlers: readonly ReferenceHandler[]
): ExtensionForModules<[ReferencesModule]> {
	return defineExtension<[ReferencesModule]>((api) => {
		for (const handler of handlers) {
			api.registerReferenceHandler(handler);
		}
	});
}
