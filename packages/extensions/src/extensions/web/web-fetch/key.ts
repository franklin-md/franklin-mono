import { storeKey } from '../../../systems/store/api/key.js';
import type { WebFetchCache } from './types.js';

export const webFetchCacheKey = storeKey<'web_fetch_cache', WebFetchCache>(
	'web_fetch_cache',
);
