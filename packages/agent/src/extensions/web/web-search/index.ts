export { webSearchExtension, webSearchToolExtension } from './extension.js';
export { createDuckDuckGoWebSearchProvider } from './providers/duck-duck-go/provider.js';
export { createExaWebSearchProvider } from './providers/exa/provider.js';
export { webSearchProviders } from './configuration.js';
export type {
	WebSearchProvider,
	WebSearchProviderRequest,
} from './provider.js';
export type { WebSearchExtensionOptions, WebSearchResult } from './types.js';
export { DEFAULT_WEB_SEARCH_OPTIONS } from './types.js';
