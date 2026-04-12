import { bindClient } from '@franklin/lib/proxy';
import type { Descriptor, ProxyType } from '@franklin/lib/proxy';
import type { FranklinIpcRuntime } from '../../../shared/api.js';
import { createClientRuntime } from './runtime.js';

export function bindRenderer<D extends Descriptor>(
	schema: D,
	ipc: FranklinIpcRuntime,
): ProxyType<D> {
	const runtime = createClientRuntime(ipc, '');
	return bindClient(schema, runtime);
}
