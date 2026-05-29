import {
	bindWithRuntime,
	type BaseRuntime,
	type Compiler,
	type RegistryView,
} from '@franklin/extensibility';
import type {
	ReferenceHandler,
	ReferenceHandlerRuntime,
	ReferencesSignature,
} from '../api/index.js';
import {
	ReferencesEngine,
	type ReferenceRegistry,
	type RegisteredReferenceHandler,
} from '../engine.js';
import type { ReferencesRuntime } from './types.js';

export function createReferencesCompiler(): Compiler<
	ReferencesSignature,
	ReferencesRuntime
> {
	return {
		async compile<Runtime extends BaseRuntime>(
			registry: RegistryView<ReferencesSignature, Runtime>,
			getRuntime: () => Runtime,
		): Promise<ReferencesRuntime> {
			return {
				references: new ReferencesEngine(
					createHandlerRegistry(registry, getRuntime),
				),
				async dispose(): Promise<void> {},
			};
		},
	};
}

function createHandlerRegistry<Runtime extends BaseRuntime>(
	registry: RegistryView<ReferencesSignature, Runtime>,
	getRuntime: () => Runtime,
): ReferenceRegistry {
	const handlers: RegisteredReferenceHandler[] = [];
	for (const [handler] of registry.argsFor('registerReferenceHandler')) {
		handlers.push(bindReferenceHandler(handler, getRuntime));
	}
	return handlers;
}

function bindReferenceHandler<Runtime extends BaseRuntime>(
	handler: ReferenceHandler<Runtime & ReferenceHandlerRuntime>,
	getRuntime: () => Runtime,
): RegisteredReferenceHandler {
	const toContext = bindWithRuntime(
		handler.toContext,
		() => getRuntime() as Runtime & ReferenceHandlerRuntime,
	);
	return {
		test(reference) {
			return handler.test(reference);
		},
		async toContext(reference, delegate) {
			return toContext(reference, delegate);
		},
	};
}
