import { ndJsonStream } from '@agentclientprotocol/sdk';
import type { Transport } from '@franklin/agent/browser';

declare global {
	interface Window {
		franklinBridge: {
			spawn(agentName: string, cwd: string): Promise<string>;
			send(agentId: string, chunk: Uint8Array): void;
			onData(
				callback: (agentId: string, chunk: Uint8Array) => void,
			): () => void;
			dispose(agentId: string): Promise<void>;
			startMcp(
				serializedTools: unknown[],
			): Promise<{ config: unknown; mcpId: string }>;
			stopMcp(mcpId: string): Promise<void>;
		};
	}
}

/**
 * Creates a Transport backed by Electron IPC.
 *
 * Bytes written to the stream are sent to the main process (→ subprocess stdin).
 * Bytes from the main process (subprocess stdout →) are pushed into the readable stream.
 * ndJsonStream wraps the raw byte streams into the ACP message-level Stream.
 */
export function createRendererIpcTransport(agentId: string): Transport {
	let readableController: ReadableStreamDefaultController<Uint8Array>;

	const readable = new ReadableStream<Uint8Array>({
		start(controller) {
			readableController = controller;
		},
	});

	// Subscribe to data from this specific agent's subprocess stdout
	const unsubscribe = window.franklinBridge.onData((id, chunk) => {
		if (id === agentId) {
			readableController.enqueue(chunk);
		}
	});

	const writable = new WritableStream<Uint8Array>({
		write(chunk) {
			window.franklinBridge.send(agentId, chunk);
		},
	});

	const stream = ndJsonStream(writable, readable);

	return {
		stream,
		async dispose() {
			unsubscribe();
			try {
				readableController.close();
			} catch {
				// Already closed
			}
			await window.franklinBridge.dispose(agentId);
		},
	};
}
