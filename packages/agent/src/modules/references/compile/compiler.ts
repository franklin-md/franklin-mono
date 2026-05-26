import type {
	BaseRuntime,
	Compiler,
	RegistryView,
} from '@franklin/extensibility';
import type {
	ReferenceHandler,
	ReferenceHandlerRuntime,
	ReferencesSignature,
} from '../api/index.js';
import { createReferencesRuntime } from './runtime.js';
import type {
	ReferenceRegistry,
	ReferencesRuntime,
	RegisteredReferenceHandler,
} from './types.js';

export function createReferencesCompiler(): Compiler<
	ReferencesSignature,
	ReferencesRuntime
> {
	return {
		async compile<Runtime extends BaseRuntime>(
			registry: RegistryView<ReferencesSignature, Runtime>,
			getRuntime: () => Runtime,
		): Promise<ReferencesRuntime> {
			return createReferencesRuntime({
				handlers: createHandlerRegistry(registry, getRuntime),
			});
		},
	};
}

function createHandlerRegistry<Runtime extends BaseRuntime>(
	registry: RegistryView<ReferencesSignature, Runtime>,
	getRuntime: () => Runtime,
): ReferenceRegistry {
	const handlers = new Map<string, RegisteredReferenceHandler>();
	for (const [handler] of registry.argsFor('registerReferenceHandler')) {
		const typedHandler = handler as ReferenceHandler<
			Runtime & ReferenceHandlerRuntime
		>;
		if (handlers.has(typedHandler.type)) {
			throw new Error(
				`Reference handler "${typedHandler.type}" registered more than once`,
			);
		}
		handlers.set(typedHandler.type, {
			toContext(reference) {
				return Promise.resolve(
					typedHandler.toContext(
						reference,
						getRuntime() as Runtime & ReferenceHandlerRuntime,
					),
				);
			},
		});
	}
	return handlers;
}
