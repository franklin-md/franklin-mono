import type { Fetch } from '../types.js';
import type { FetchDecorator } from './types.js';

export interface FetchBuilder {
	with(decorator: FetchDecorator): FetchBuilder;
	build(): Fetch;
}

/**
 * Fluent composer for `FetchDecorator` chains. The first `.with()` wraps the
 * transport directly (innermost — runs last on the request, first on the
 * response); each subsequent `.with()` wraps the previous layer.
 */
export function decorate(transport: Fetch): FetchBuilder {
	let current: Fetch = transport;
	const builder: FetchBuilder = {
		with(decorator) {
			current = decorator(current);
			return builder;
		},
		build() {
			return current;
		},
	};
	return builder;
}
