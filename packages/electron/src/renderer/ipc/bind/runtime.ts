import type {
	ProxyRuntime,
	ResourceBinding,
	MethodHandler,
	Transport,
} from '@franklin/lib/proxy';
import type { FranklinIpcRuntime } from '../../../shared/api.js';
import { createPaths } from '../../../shared/paths.js';
import { createIpcStream } from '../stream.js';

/**
 * Cursor-based proxy runtime over a scoped IPC runtime.
 *
 * Mirrors the server-side `createServerRuntime(prefix, webContents)` —
 * both are prefix cursors, one registers handlers at channels, the other
 * invokes them. `bindNamespace(key)` appends `:key` to the path.
 */
export function createClientRuntime(
	ipc: FranklinIpcRuntime,
	path: string,
): ProxyRuntime {
	const paths = createPaths(path);
	return {
		bindNamespace(key: string): ProxyRuntime {
			return createClientRuntime(ipc, paths.forNamespace(key));
		},

		bindMethod(): MethodHandler {
			return (...args: unknown[]) => ipc.invoke(paths.forMethod(), ...args);
		},

		bindTransport(): Transport {
			return createIpcStream(ipc, paths.forStream());
		},

		bindResource(): ResourceBinding {
			return async (...args: unknown[]) => {
				const id = (await ipc.invoke(paths.forConnect(), ...args)) as string;
				const runtime = createClientRuntime(ipc, paths.forLease(id));
				return Object.assign(runtime, {
					dispose: () => ipc.invoke(paths.forKill(), id) as Promise<void>,
				});
			};
		},
	};
}
