import type { WebFetchResponse } from '@franklin/lib';

/** Host-owned source cache shared across reference extensions and agents. */
export interface HTTPReferenceCache {
	getOrLoad(
		key: string,
		load: () => Promise<WebFetchResponse>,
	): Promise<WebFetchResponse>;
	clear(): Promise<void>;
}
