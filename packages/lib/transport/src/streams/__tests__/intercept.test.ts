import { describe, expect, it, vi } from 'vitest';

import { createDuplexPair } from '../../in-memory/index.js';
import { intercept } from '../duplex/intercept.js';
import type { Duplex } from '../types.js';

/** Duplex `a` of a pair plus handles to push/read via the peer `b` (see `createDuplexPair`). */
function createMemoryDuplex<T>(): {
	duplex: Duplex<T>;
	pushReadable: WritableStreamDefaultWriter<T>;
	pullWritable: ReadableStreamDefaultReader<T>;
} {
	const { a, b } = createDuplexPair<T>();
	return {
		duplex: a,
		pushReadable: b.writable.getWriter(),
		pullWritable: b.readable.getReader(),
	};
}

describe('intercept', () => {
	describe('passthrough', () => {
		it('passes readable values through when handler calls addToRead', async () => {
			const { duplex, pushReadable } = createMemoryDuplex<string>();
			const wrapped = intercept(duplex, {
				readable: (chunk, addToRead) => addToRead(chunk),
			});
			const reader = wrapped.readable.getReader();

			await pushReadable.write('hello');
			const { value } = await reader.read();

			expect(value).toBe('hello');
			reader.releaseLock();
			await pushReadable.close();
		});

		it('passes writable values through when handler forwards on passWrite', async () => {
			const { duplex, pullWritable } = createMemoryDuplex<string>();
			const wrapped = intercept(duplex, {
				// Handler<W,R>: pass inner write (2nd), inject readable (3rd)
				writable: (_chunk, passWrite) => passWrite(_chunk),
			});
			const writer = wrapped.writable.getWriter();

			await writer.write('world');
			await new Promise((r) => setTimeout(r, 0));
			const { value } = await pullWritable.read();

			expect(value).toBe('world');
			pullWritable.releaseLock();
			await writer.close();
		});
	});

	describe('transform', () => {
		it('transforms readable chunks', async () => {
			const { duplex, pushReadable } = createMemoryDuplex<number>();
			const wrapped = intercept(duplex, {
				readable: (chunk, addToRead) => addToRead(chunk * 2),
			});
			const reader = wrapped.readable.getReader();

			await pushReadable.write(5);
			const { value } = await reader.read();

			expect(value).toBe(10);
			reader.releaseLock();
			await pushReadable.close();
		});

		it('transforms writable chunks', async () => {
			const { duplex, pullWritable } = createMemoryDuplex<string>();
			const wrapped = intercept(duplex, {
				writable: (chunk, passWrite) => passWrite(chunk.toUpperCase()),
			});
			const writer = wrapped.writable.getWriter();

			await writer.write('hello');
			await new Promise((r) => setTimeout(r, 0));
			const { value } = await pullWritable.read();

			expect(value).toBe('HELLO');
			pullWritable.releaseLock();
			await writer.close();
		});
	});

	describe('filter', () => {
		it('drops readable chunks when handler does not call addToRead', async () => {
			const { duplex, pushReadable } = createMemoryDuplex<number>();
			const dropped: number[] = [];
			const wrapped = intercept(duplex, {
				readable: (chunk, addToRead) => {
					if (chunk % 2 === 0) {
						addToRead(chunk);
					} else {
						dropped.push(chunk);
					}
				},
			});
			const reader = wrapped.readable.getReader();

			await pushReadable.write(1); // odd → dropped
			await pushReadable.write(2); // even → enqueued

			const { value } = await reader.read();
			expect(value).toBe(2);
			expect(dropped).toEqual([1]);

			reader.releaseLock();
			await pushReadable.close();
		});

		it('drops writable chunks when handler does not call addToWrite', async () => {
			const { duplex, pullWritable } = createMemoryDuplex<number>();
			const wrapped = intercept(duplex, {
				writable: (chunk, passWrite) => {
					if (chunk > 0) passWrite(chunk);
				},
			});
			const writer = wrapped.writable.getWriter();

			await writer.write(-1);
			await writer.write(42);
			await new Promise((r) => setTimeout(r, 0));
			const { value } = await pullWritable.read();

			expect(value).toBe(42);
			pullWritable.releaseLock();
			await writer.close();
		});
	});

	describe('partial handlers', () => {
		it('leaves writable unchanged when only readable handler provided', async () => {
			const { duplex, pullWritable } = createMemoryDuplex<string>();
			const wrapped = intercept(duplex, {
				readable: (chunk, addToRead) => addToRead(chunk + '!'),
			});

			const writer = wrapped.writable.getWriter();
			await writer.write('raw');
			await new Promise((r) => setTimeout(r, 0));
			const { value } = await pullWritable.read();

			expect(value).toBe('raw');
			pullWritable.releaseLock();
			await writer.close();
		});

		it('leaves readable unchanged when only writable handler provided', async () => {
			const { duplex, pushReadable } = createMemoryDuplex<string>();
			const wrapped = intercept(duplex, {
				writable: (chunk, passWrite) => passWrite(chunk + '!'),
			});

			const reader = wrapped.readable.getReader();
			await pushReadable.write('raw');
			const { value } = await reader.read();

			expect(value).toBe('raw');
			reader.releaseLock();
			await pushReadable.close();
		});
	});

	describe('cross-direction', () => {
		it('readable handler can inject into writable via addToWrite', async () => {
			const { duplex, pushReadable, pullWritable } =
				createMemoryDuplex<string>();
			const wrapped = intercept(duplex, {
				readable: (chunk, addToRead, addToWrite) => {
					if (chunk === 'ping') {
						addToWrite('pong'); // respond back
						return; // don't forward
					}
					addToRead(chunk);
				},
			});

			const reader = wrapped.readable.getReader();

			await pushReadable.write('ping');
			await new Promise((r) => setTimeout(r, 0));

			// 'pong' should appear on the writable (downstream) side
			const { value: writeVal } = await pullWritable.read();
			expect(writeVal).toBe('pong');

			// 'ping' should NOT appear on readable output
			await pushReadable.write('hello');
			const { value: readVal } = await reader.read();
			expect(readVal).toBe('hello');

			reader.releaseLock();
			pullWritable.releaseLock();
			await pushReadable.close();
		});

		it('writable handler can inject into readable via addToRead', async () => {
			const {
				duplex,
				pushReadable: _push,
				pullWritable,
			} = createMemoryDuplex<string>();
			const wrapped = intercept(duplex, {
				writable: (chunk, passWrite, injectRead) => {
					injectRead(`echo:${chunk}`); // inject into readable
					passWrite(chunk); // also forward normally
				},
			});

			const reader = wrapped.readable.getReader();
			const writer = wrapped.writable.getWriter();

			await writer.write('test');
			await new Promise((r) => setTimeout(r, 0));

			// Should appear on readable
			const { value: readVal } = await reader.read();
			expect(readVal).toBe('echo:test');

			// Should also appear on writable
			const { value: writeVal } = await pullWritable.read();
			expect(writeVal).toBe('test');

			reader.releaseLock();
			pullWritable.releaseLock();
			await writer.close();
		});
	});

	describe('dispose', () => {
		it('delegates dispose to the underlying duplex', async () => {
			const disposeFn = vi.fn().mockResolvedValue(undefined);
			const input = new TransformStream<string>();
			const output = new TransformStream<string>();
			const duplex: Duplex<string> = {
				readable: input.readable,
				writable: output.writable,
				dispose: disposeFn,
			};

			const wrapped = intercept(duplex, {
				readable: (chunk, addToRead) => addToRead(chunk),
			});
			await wrapped.dispose();

			expect(disposeFn).toHaveBeenCalledOnce();
		});
	});
});
