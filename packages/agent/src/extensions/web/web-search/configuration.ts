import { Configuration } from '@franklin/extensibility/module';
import type { WebSearchProvider } from './provider.js';

export const webSearchProviders = new Configuration<
	WebSearchProvider,
	readonly WebSearchProvider[]
>({
	name: 'webSearchProviders',
	combine: (providers) => providers,
});
