import { getValueAtPath } from '@franklin/lib/proxy';
import type { ProxyRuntime, ResourceBinding } from '@franklin/lib/proxy';
import type {
	PreloadResourceBridge,
	PreloadStreamBridge,
} from '../../../shared/api.js';
import { createIpcStream } from '../stream.js';

/**
 * A single recursive function: bridge → ProxyRuntime.
 *
 * At every level (top-level or inside a resource), the bridge has the same
 * recursive shape — methods are functions, streams are PreloadStreamBridge,
 * resources are { connect, kill, inner(id) → sub-bridge }.
 *
 * No type dispatch on descriptor inner types anywhere.
 */
export function createClientRuntime(
	bridge: Record<string, unknown>,
): ProxyRuntime {
	return {
		bindMethod(path: string[]): (...args: unknown[]) => Promise<unknown> {
			return getValueAtPath(bridge, path) as (
				...args: unknown[]
			) => Promise<unknown>;
		},

		bindStream(path: string[]): unknown {
			return createIpcStream(
				getValueAtPath(bridge, path) as PreloadStreamBridge<any, any>,
			);
		},

		bindResource(path: string[]): ResourceBinding {
			const res = getValueAtPath(bridge, path) as PreloadResourceBridge;
			return {
				connect: (...args: unknown[]) => res.connect(...args),
				kill: (id: string) => res.kill(id),
				inner(id: string): ProxyRuntime {
					return createClientRuntime(res.inner(id) as Record<string, unknown>);
				},
			};
		},
	};
}
