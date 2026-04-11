import { ipcRenderer } from 'electron';
import {
	isMethodDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
	isStreamDescriptor,
} from '@franklin/lib/proxy';
import type {
	AnyShape,
	Descriptor,
	NamespaceDescriptor,
} from '@franklin/lib/proxy';

import type { ChannelScope, ResourceScope } from '../shared/channels.js';
import { createScope } from '../shared/channels.js';
import {
	isIpcStreamMessage,
	type PreloadBridgeOf,
	type PreloadStreamBridge,
} from '../shared/api.js';

// ---------------------------------------------------------------------------
// Stream bridge -- wraps a single IPC channel as a subscribe/send/close triple
// ---------------------------------------------------------------------------

function createIpcStreamBridge(channel: string): PreloadStreamBridge {
	return {
		subscribe: (observer) => {
			let active = true;
			const handler = (_event: Electron.IpcRendererEvent, packet: unknown) => {
				if (!active || !isIpcStreamMessage(packet)) {
					return;
				}

				if (packet.kind === 'data') {
					observer.next(packet.data);
					return;
				}

				active = false;
				ipcRenderer.removeListener(channel, handler);
				observer.close();
			};

			ipcRenderer.on(channel, handler);
			return () => {
				if (!active) return;
				active = false;
				ipcRenderer.removeListener(channel, handler);
			};
		},
		send: (packet) => {
			ipcRenderer.send(channel, { kind: 'data', data: packet });
		},
		close: async () => {
			ipcRenderer.send(channel, { kind: 'close' });
		},
	};
}

// ---------------------------------------------------------------------------
// Recursive bridge builder
// ---------------------------------------------------------------------------

function buildBridge(
	descriptor: Descriptor,
	path: readonly string[],
	scope: ChannelScope,
): unknown {
	if (isMethodDescriptor(descriptor)) {
		const channel = scope.method(path);
		return (...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
	}

	if (isStreamDescriptor(descriptor)) {
		return createIpcStreamBridge(scope.stream(path));
	}

	if (isNamespaceDescriptor(descriptor)) {
		const shape = descriptor.shape as AnyShape;
		const node: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(shape)) {
			node[key] = buildBridge(child, [...path, key], scope);
		}
		return node;
	}

	if (isResourceDescriptor(descriptor)) {
		const res = scope.resource(path);
		return buildResourceBridge(descriptor.inner as Descriptor, res);
	}

	throw new Error(`Unknown descriptor at ${(path as string[]).join('.')}`);
}

function buildResourceBridge(
	innerDescriptor: Descriptor,
	res: ResourceScope,
): unknown {
	const innerScope = res.inner();
	return {
		connect: (...args: unknown[]) =>
			ipcRenderer.invoke(res.connect, ...args) as Promise<string>,
		kill: (id: string) => ipcRenderer.invoke(res.kill, id) as Promise<void>,
		inner: (id: string) =>
			buildInnerBridge(innerDescriptor, [], innerScope, id),
	};
}

/**
 * Build a sub-bridge for a resource instance. Methods are curried with the
 * lease ID (ID is the first IPC argument). Streams use per-instance channels.
 */
function buildInnerBridge(
	descriptor: Descriptor,
	path: readonly string[],
	scope: ChannelScope,
	id: string,
): unknown {
	if (isMethodDescriptor(descriptor)) {
		const channel = scope.method(path);
		return (...args: unknown[]) => ipcRenderer.invoke(channel, id, ...args);
	}

	if (isStreamDescriptor(descriptor)) {
		// Per-instance stream: static channel + ':' + instance ID
		return createIpcStreamBridge(`${scope.stream(path)}:${id}`);
	}

	if (isNamespaceDescriptor(descriptor)) {
		const shape = descriptor.shape as AnyShape;
		const node: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(shape)) {
			node[key] = buildInnerBridge(child, [...path, key], scope, id);
		}
		return node;
	}

	if (isResourceDescriptor(descriptor)) {
		throw new Error('Nested resources inside resources are not yet supported');
	}

	throw new Error(`Unknown descriptor at ${(path as string[]).join('.')}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function bindPreload<TSchema extends NamespaceDescriptor<any, any>>(
	name: string,
	schema: TSchema,
): PreloadBridgeOf<TSchema> {
	const scope = createScope(name);
	return buildBridge(schema, [], scope) as PreloadBridgeOf<TSchema>;
}
