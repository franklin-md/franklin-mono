import type { API, BoundAPI, ComposeAPI } from '../api/types.js';
import type { ExtensionPoint } from './types.js';
import type { RegistryWriter } from './writer.js';

export type CombineAPI<A1 extends API, A2 extends API> = ComposeAPI<A1, A2>;

// TODO: Add the same API-key overlap guard used by module composition before
// exposing this helper as a public composition surface.
export function combine<A1 extends API, A2 extends API>(
	p1: ExtensionPoint<A1>,
	p2: ExtensionPoint<A2>,
): ExtensionPoint<CombineAPI<A1, A2>> {
	type CA = CombineAPI<A1, A2>;
	return (<R extends CA['In']>(writer: RegistryWriter<CA, R>) =>
		({
			...p1<R>(writer as never),
			...p2<R>(writer as never),
		}) as BoundAPI<CA, R>) as ExtensionPoint<CA>;
}
