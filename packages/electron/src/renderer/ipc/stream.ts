import type { Duplex } from '@franklin/transport';

import type { FranklinPreloadBridge } from '../../shared/schema.js';
import type { PreloadStreamBridge } from '../../shared/api.js';
import type { AuthBridge } from './auth-store.js';

declare global {
	interface Window {
		__franklinBridge: FranklinPreloadBridge;
		__franklinAuth: AuthBridge;
	}
}

export function getPreloadBridge(): FranklinPreloadBridge {
	return window.__franklinBridge;
}

export function createIpcStream<R, W = R>(
	bridge: PreloadStreamBridge<R, W>,
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
		} catch {}
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
				await bridge.close();
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
			unsubscribe = bridge.subscribe({
				next: (packet) => {
					if (closed) return;
					nextController.enqueue(packet);
				},
				close: () => {
					void closeStream(false, true);
				},
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
			bridge.send(packet);
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
