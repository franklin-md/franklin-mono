import { describe, expect, it, vi } from 'vitest';

import { debugStream } from '../duplex/debug.js';
import type { Duplex } from '../types.js';

function createMemoryDuplex<T>(): {
	duplex: Duplex<T>;
	writer: WritableStreamDefaultWriter<T>;
	reader: ReadableStreamDefaultReader<T>;
} {
	const input = new TransformStream<T>();
	const output = new TransformStream<T>();

	const duplex: Duplex<T> = {
		readable: input.readable,
		writable: output.writable,
		close: async () => {},
	};

	return {
		duplex,
		writer: input.writable.getWriter(),
		reader: output.readable.getReader(),
	};
}

describe('debug', () => {
	it('passes readable values through unchanged', async () => {
		const { duplex, writer } = createMemoryDuplex<string>();
		const wrapped = debugStream(duplex, 'test');
		const reader = wrapped.readable.getReader();

		await writer.write('hello');
		const { value } = await reader.read();

		expect(value).toBe('hello');

		reader.releaseLock();
		await writer.close();
	});

	it('passes writable values through unchanged', async () => {
		const { duplex, reader } = createMemoryDuplex<string>();
		const wrapped = debugStream(duplex, 'test');
		const wWriter = wrapped.writable.getWriter();

		await wWriter.write('world');
		await new Promise((r) => setTimeout(r, 0));
		const { value } = await reader.read();

		expect(value).toBe('world');

		reader.releaseLock();
		await wWriter.close();
	});

	it('logs readable chunks with label', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const { duplex, writer } = createMemoryDuplex<string>();
		const wrapped = debugStream(duplex, 'my-label');
		const reader = wrapped.readable.getReader();

		await writer.write('data');
		await reader.read();

		expect(spy).toHaveBeenCalledWith(
			'[my-label] readable:',
			JSON.stringify('data', null, 2),
		);

		reader.releaseLock();
		await writer.close();
		spy.mockRestore();
	});

	it('logs writable chunks with label', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const { duplex, reader } = createMemoryDuplex<string>();
		const wrapped = debugStream(duplex, 'my-label');
		const wWriter = wrapped.writable.getWriter();

		await wWriter.write('data');
		await new Promise((r) => setTimeout(r, 0));
		await reader.read();

		expect(spy).toHaveBeenCalledWith(
			'[my-label] writable:',
			JSON.stringify('data', null, 2),
		);

		reader.releaseLock();
		await wWriter.close();
		spy.mockRestore();
	});

	it('uses "debug" as default label', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const { duplex, writer } = createMemoryDuplex<number>();
		const wrapped = debugStream(duplex);
		const reader = wrapped.readable.getReader();

		await writer.write(42);
		await reader.read();

		expect(spy).toHaveBeenCalledWith(
			'[debug] readable:',
			JSON.stringify(42, null, 2),
		);

		reader.releaseLock();
		await writer.close();
		spy.mockRestore();
	});

	it('delegates close to the underlying duplex', async () => {
		const closeFn = vi.fn().mockResolvedValue(undefined);
		const input = new TransformStream<string>();
		const output = new TransformStream<string>();

		const duplex: Duplex<string> = {
			readable: input.readable,
			writable: output.writable,
			close: closeFn,
		};

		const wrapped = debugStream(duplex, 'test');
		await wrapped.close();

		expect(closeFn).toHaveBeenCalledOnce();
	});
});
