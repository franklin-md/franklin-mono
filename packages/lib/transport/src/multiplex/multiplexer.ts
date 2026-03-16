import type { Duplex, Observer } from '../streams/types.js';
import { observe } from '../streams/readable/observe.js';
import { callable } from '../streams/writable/callable.js';
import type { MuxPacket } from './types.js';

/**
 * Multiplexes a single Duplex<MuxPacket<R>, MuxPacket<W>> into named channels.
 *
 * Fan-out: an internal observer reads MuxPacket<R> from the transport
 * and dispatches each packet to the channel matching packet.id.
 *
 * Fan-in: each channel wraps outgoing W data as { id, data } and writes
 * to the shared transport writable via a single callable writer.
 */
export class Multiplexer<R, W = R> {
	private observer: Observer<MuxPacket<R>>;
	private send: (packet: MuxPacket<W>) => void;

	constructor(private transport: Duplex<MuxPacket<R>, MuxPacket<W>>) {
		this.observer = observe(transport.readable);
		this.send = callable(transport.writable);
	}

	/**
	 * Returns a Duplex<R, W> for the named channel.
	 *
	 * Reads are filtered to only packets with matching id.
	 * Writes are wrapped as { id: name, data } before sending.
	 */
	channel(name: string): Duplex<R, W> {
		let readableController: ReadableStreamDefaultController<R>;

		const readable = new ReadableStream<R>({
			start(controller) {
				readableController = controller;
			},
		});

		const unsubscribe = this.observer.subscribe((packet) => {
			if (packet.id !== name) return;
			readableController.enqueue(packet.data);
		});

		const writable = new WritableStream<W>({
			write: (data) => {
				this.send({ id: name, data });
			},
		});

		return {
			readable,
			writable,
			close: async () => {
				unsubscribe();
				try {
					readableController.close();
				} catch {
					// Already closed
				}
			},
		};
	}

	async close(): Promise<void> {
		this.observer.dispose();
		await this.transport.close();
	}
}
