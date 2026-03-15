import { describe, expect, it } from 'vitest';

import { streamToEventInterface } from '../event-driven/stream-to-event.js';

/**
 * streamToEventInterface adapts a Stream<T> into an EventInterface<T>:
 *   - on()     → subscribe to values from the readable side
 *   - invoke() → write values to the writable side
 */
describe('streamToEventInterface', () => {
	it('round-trips: invoke() writes, on() receives via same stream', async () => {
		const ts = new TransformStream<string>();
		const { on, invoke } = streamToEventInterface<string>({
			readable: ts.readable,
			writable: ts.writable,
			close: async () => {},
		});

		const received: string[] = [];
		on((v) => received.push(v));

		invoke('hello');
		invoke('world');
		await new Promise((r) => setTimeout(r, 0));

		expect(received).toEqual(['hello', 'world']);
	});

	it('multiple subscribers via on()', async () => {
		const ts = new TransformStream<number>();
		const { on, invoke } = streamToEventInterface<number>({
			readable: ts.readable,
			writable: ts.writable,
			close: async () => {},
		});

		const first: number[] = [];
		const second: number[] = [];
		on((v) => first.push(v));
		on((v) => second.push(v));

		invoke(42);
		await new Promise((r) => setTimeout(r, 0));

		expect(first).toEqual([42]);
		expect(second).toEqual([42]);
	});

	it('unsubscribe from on()', async () => {
		const ts = new TransformStream<string>();
		const { on, invoke } = streamToEventInterface<string>({
			readable: ts.readable,
			writable: ts.writable,
			close: async () => {},
		});

		const received: string[] = [];
		const unsub = on((v) => received.push(v));

		invoke('before');
		await new Promise((r) => setTimeout(r, 0));

		unsub();

		invoke('after');
		await new Promise((r) => setTimeout(r, 0));

		expect(received).toEqual(['before']);
	});
});
