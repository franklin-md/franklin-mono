import type { Duplex } from '@franklin/transport';

import type { FranklinIpcRuntime } from '../../shared/api.js';
import { isIpcStreamMessage } from '../../shared/api.js';

declare global {
	interface Window {
		__franklinIpc: FranklinIpcRuntime;
	}
}

/**
 * Creates a renderer-side duplex stream over IPC.
 *
 * Uses `ipc.subscribe(channel)` for the readable side and
 * `ipc.send(channel, packet)` for the writable side, following
 * the `IpcStreamMessage` protocol ({ kind: 'data', data } | { kind: 'close' }).
 */
export function createIpcStream<R, W = R>(
	ipc: FranklinIpcRuntime,
	channel: string,
	onClose?: () => Promise<void>,
): Duplex<R, W> {
	let controller: ReadableStreamDefaultController<R> | null = null;
	let unsubscribe: (() => void) | null = null;
	let closePromise: Promise<void> | null = null;
	let closed = false;

	const detach = () => {
		if (unsubscribe == null) return;
		unsubscribe();
		unsubscribe = null;
	};

	const closeReadable = () => {
		if (controller == null) return;
		try {
			controller.close();
		} catch {
			// ReadableStream controllers throw if already closed.
		}
	};

	const closeStream = (
		notifyPeer: boolean,
		releaseLease: boolean,
	): Promise<void> => {
		if (closePromise) {
			return closePromise;
		}

		closePromise = (async () => {
			if (closed) return;
			closed = true;
			detach();
			closeReadable();
			if (notifyPeer) {
				ipc.send(channel, { kind: 'close' });
			}
			if (releaseLease) {
				await onClose?.();
			}
		})();

		return closePromise;
	};

	const readable = new ReadableStream<R>({
		start(nextController) {
			controller = nextController;
			unsubscribe = ipc.subscribe(channel, (packet: unknown) => {
				if (closed) return;
				if (!isIpcStreamMessage(packet)) return;
				if (packet.kind === 'close') {
					void closeStream(false, true);
				} else {
					nextController.enqueue(packet.data as R);
				}
			});
		},
		cancel() {
			return closeStream(true, true);
		},
	});

	const writable = new WritableStream<W>({
		write(packet) {
			if (closed) {
				throw new Error('IPC stream is closed');
			}
			ipc.send(channel, { kind: 'data', data: packet });
		},
		close() {
			return closeStream(true, true);
		},
		abort() {
			return closeStream(true, true);
		},
	});

	return {
		readable,
		writable,
		close: () => closeStream(true, true),
	};
}
