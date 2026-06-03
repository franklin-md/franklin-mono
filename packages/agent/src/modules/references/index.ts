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
export {
	ParsedSelector,
	parseSelectorIntegerRangeValue,
} from './selectors/index.js';
export type {
	SelectorFieldValue,
	SelectorFields,
	SelectorIntegerOptions,
	SelectorIntegerRange,
	SelectorIntegerRangeParseResult,
} from './selectors/index.js';
export type { ReferencesModule } from './module.js';
export { createReferencesModule } from './module.js';
