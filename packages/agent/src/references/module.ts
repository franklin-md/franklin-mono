import {
	createExtensionPoint,
	type ExtensionModule,
} from '@franklin/extensions';
import type { ReferencesSignature } from './api/index.js';
import { createReferencesCompiler } from './compile/index.js';
import type { ReferencesRuntime } from './runtime.js';

export type ReferencesModule = ExtensionModule<
	ReferencesSignature,
	ReferencesRuntime
>;

const referencesExtensionPoint = createExtensionPoint<ReferencesSignature>({
	registerReferenceHandler: true,
});

export function createReferencesModule(): ReferencesModule {
	return {
		extensionPoint: referencesExtensionPoint,
		compiler: createReferencesCompiler(),
	};
}
