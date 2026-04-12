import type {
	ProxyRuntime,
	ResourceBinding,
	MethodHandler,
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

		bindStream(): unknown {
			return createIpcStream(ipc, paths.forStream());
		},

		bindResource(): ResourceBinding {
			return {
				connect: (...args: unknown[]) =>
					ipc.invoke(paths.forConnect(), ...args) as Promise<string>,
				kill: (id: string) =>
					ipc.invoke(paths.forKill(), id) as Promise<void>,
				inner(id: string): ProxyRuntime {
					return createClientRuntime(ipc, paths.forLease(id));
				},
			};
		},
	};
}
