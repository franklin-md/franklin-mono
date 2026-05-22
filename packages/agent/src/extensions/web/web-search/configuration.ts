import { createConfiguration } from '@franklin/extensibility/module';
import type { WebSearchProvider } from './provider.js';

export const webSearchProviders = createConfiguration<
	WebSearchProvider,
	readonly WebSearchProvider[]
>({
	name: 'webSearchProviders',
	combine: (providers) => providers,
});
