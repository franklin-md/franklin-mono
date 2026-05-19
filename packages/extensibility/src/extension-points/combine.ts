import type { AssertNoOverlap } from '@franklin/lib';
import type { API, CombineSignature, Signature } from '../api/types.js';
import type { ExtensionPoint } from './types.js';
import type { RegistryWriter } from './writer.js';

export function combine<S1 extends Signature, S2 extends Signature>(
	p1: ExtensionPoint<S1>,
	p2: ExtensionPoint<S2> &
		AssertNoOverlap<
			API<S1, CombineSignature<S1, S2>['In']>,
			API<S2, CombineSignature<S1, S2>['In']>
		>,
): ExtensionPoint<CombineSignature<S1, S2>> {
	type CS = CombineSignature<S1, S2>;
	return (<R extends CS['In']>(writer: RegistryWriter<CS, R>) =>
		({
			...p1<R>(writer as never),
			...p2<R>(writer as never),
		}) as API<CS, R>) as ExtensionPoint<CS>;
}
