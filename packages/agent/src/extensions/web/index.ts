export { createWebExtension } from './bundle.js';
export type { WebExtensionOptions } from './bundle.js';
export { webFetchExtension } from './web-fetch/index.js';
export type { WebFetchExtensionOptions } from './web-fetch/index.js';
export {
	DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID,
	EXA_WEB_SEARCH_PROVIDER_ID,
	createDuckDuckGoWebSearchProvider,
	createExaWebSearchProvider,
	webSearchExtension,
	webSearchProviders,
	webSearchToolExtension,
} from './web-search/index.js';
export type {
	WebSearchExtensionOptions,
	WebSearchOutput,
	WebSearchProvider,
	WebSearchProviderRequest,
	WebSearchResult,
} from './web-search/index.js';
