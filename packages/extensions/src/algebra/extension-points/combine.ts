import type { API, ComposeSignature, Signature } from '../api/types.js';
import type { ExtensionPoint } from './types.js';
import type { RegistryWriter } from './writer.js';

export type CombineSignature<
	S1 extends Signature,
	S2 extends Signature,
> = ComposeSignature<S1, S2>;

// TODO: Add the same API-key overlap guard used by module composition before
// exposing this helper as a public composition surface.
export function combine<S1 extends Signature, S2 extends Signature>(
	p1: ExtensionPoint<S1>,
	p2: ExtensionPoint<S2>,
): ExtensionPoint<CombineSignature<S1, S2>> {
	type CS = CombineSignature<S1, S2>;
	return (<R extends CS['In']>(writer: RegistryWriter<CS, R>) =>
		({
			...p1<R>(writer as never),
			...p2<R>(writer as never),
		}) as API<CS, R>) as ExtensionPoint<CS>;
}
