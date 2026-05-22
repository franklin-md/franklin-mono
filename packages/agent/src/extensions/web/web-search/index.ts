export { webSearchExtension, webSearchToolExtension } from './extension.js';
export { createDuckDuckGoWebSearchProvider } from './providers/duck-duck-go/provider.js';
export { createExaWebSearchProvider } from './providers/exa/provider.js';
export { webSearchProviders } from './configuration.js';
export {
	DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID,
	EXA_WEB_SEARCH_PROVIDER_ID,
} from './provider.js';
export type {
	WebSearchProvider,
	WebSearchProviderRequest,
} from './provider.js';
export type {
	WebSearchErrorOutput,
	WebSearchExtensionOptions,
	WebSearchOutput,
	WebSearchProviderFailure,
	WebSearchProviderMetadata,
	WebSearchResult,
	WebSearchSuccessOutput,
} from './types.js';
export { DEFAULT_WEB_SEARCH_OPTIONS } from './types.js';
