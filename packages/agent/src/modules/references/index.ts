export type {
	Reference,
	ReferenceContext,
	ReferenceDelegate,
	ReferenceHandlerCallback,
	ReferenceHandler,
	ReferenceHandlerRuntime,
	ResolvedData,
	ResolvedReference,
	ReferencesAPI,
	ReferencesSignature,
} from './api/index.js';
export { referenceKey } from './api/index.js';
export type { ReferencesEngine } from './engine.js';
export {
	referenceContextsToContent,
	referenceContextToContent,
} from './context.js';
export type { ReferencesModule } from './module.js';
export { createReferencesModule } from './module.js';
