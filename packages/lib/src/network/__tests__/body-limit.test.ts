import { describe, expect, it, vi } from 'vitest';
import { readBodyWithLimit } from '../body-limit.js';

describe('readBodyWithLimit', () => {
	it('accepts exactly the limit and reports only nonempty progress', async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array());
				controller.enqueue(new Uint8Array([1, 2]));
				controller.enqueue(new Uint8Array([3]));
				controller.close();
			},
		});
		const progress = vi.fn();
		expect(await readBodyWithLimit(stream, 3, progress)).toEqual(
			new Uint8Array([1, 2, 3]),
		);
		expect(progress.mock.calls).toEqual([[2], [3]]);
		expect(stream.locked).toBe(false);
	});

	it('cancels oversized streams and rejects rather than returning partial bytes', async () => {
		const cancel = vi.fn();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array([1, 2, 3, 4]));
			},
			cancel,
		});
		await expect(readBodyWithLimit(stream, 3)).rejects.toThrow(
			'Response exceeds 3 bytes',
		);
		expect(cancel).toHaveBeenCalledOnce();
		expect(stream.locked).toBe(false);
	});

	it('releases a failed reader', async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.error(new Error('connection closed'));
			},
		});
		await expect(readBodyWithLimit(stream, 3)).rejects.toThrow(
			'connection closed',
		);
		expect(stream.locked).toBe(false);
	});

	it.each([0, -1, 1.5, Infinity, NaN])(
		'rejects invalid byte cap %s and cancels the body',
		async (limit) => {
			const cancel = vi.fn();
			const stream = new ReadableStream<Uint8Array>({ cancel });
			await expect(readBodyWithLimit(stream, limit)).rejects.toThrow(
				RangeError,
			);
			expect(cancel).toHaveBeenCalledOnce();
		},
	);
});
