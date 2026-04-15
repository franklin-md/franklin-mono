import { describe, expect, it } from 'vitest';
import { AsyncEventQueue } from '../event-queue.js';

describe('AsyncEventQueue', () => {
	it('push then next returns the value', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.push(42);
		const result = await queue.next();
		expect(result).toEqual({ done: false, value: 42 });
	});

	it('next before push resolves when push happens', async () => {
		const queue = new AsyncEventQueue<string>(() => {});
		const pending = queue.next();
		queue.push('hello');
		const result = await pending;
		expect(result).toEqual({ done: false, value: 'hello' });
	});

	it('values buffer when no waiters exist', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.push(1);
		queue.push(2);
		queue.push(3);

		expect(await queue.next()).toEqual({ done: false, value: 1 });
		expect(await queue.next()).toEqual({ done: false, value: 2 });
		expect(await queue.next()).toEqual({ done: false, value: 3 });
	});

	it('multiple waiters resolve FIFO', async () => {
		const queue = new AsyncEventQueue<string>(() => {});
		const p1 = queue.next();
		const p2 = queue.next();
		const p3 = queue.next();

		queue.push('a');
		queue.push('b');
		queue.push('c');

		expect(await p1).toEqual({ done: false, value: 'a' });
		expect(await p2).toEqual({ done: false, value: 'b' });
		expect(await p3).toEqual({ done: false, value: 'c' });
	});

	it('complete terminates for-await loop', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.push(1);
		queue.push(2);
		queue.complete();

		const values: number[] = [];
		for await (const v of queue) {
			values.push(v);
		}
		expect(values).toEqual([1, 2]);
	});

	it('complete resolves all pending waiters with done', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		const p1 = queue.next();
		const p2 = queue.next();

		queue.complete();

		expect(await p1).toEqual({ done: true, value: undefined });
		expect(await p2).toEqual({ done: true, value: undefined });
	});

	it('next after complete returns done immediately', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.complete();
		expect(await queue.next()).toEqual({ done: true, value: undefined });
	});

	it('fail rejects pending waiters', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		const pending = queue.next();

		queue.fail(new Error('test error'));

		await expect(pending).rejects.toThrow('test error');
	});

	it('fail rejects subsequent next calls', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.fail(new Error('already failed'));

		await expect(queue.next()).rejects.toThrow('already failed');
	});

	it('push after complete is a no-op', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.push(1);
		queue.complete();
		queue.push(2); // should be ignored

		const values: number[] = [];
		for await (const v of queue) {
			values.push(v);
		}
		expect(values).toEqual([1]);
	});

	it('push after fail is a no-op', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.fail(new Error('failed'));
		queue.push(42); // should be ignored

		await expect(queue.next()).rejects.toThrow('failed');
	});

	it('return calls onReturn callback', async () => {
		let returnCalled = false;
		const queue = new AsyncEventQueue<number>(() => {
			returnCalled = true;
		});

		await queue.return();

		expect(returnCalled).toBe(true);
	});

	it('return after complete does not call onReturn', async () => {
		let returnCallCount = 0;
		const queue = new AsyncEventQueue<number>(() => {
			returnCallCount++;
		});

		queue.complete();
		await queue.return();

		expect(returnCallCount).toBe(0);
	});

	it('return resolves pending waiters with done', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		const pending = queue.next();

		await queue.return();

		expect(await pending).toEqual({ done: true, value: undefined });
	});

	it('return itself returns done', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		const result = await queue.return();
		expect(result).toEqual({ done: true, value: undefined });
	});

	it('return after fail does not call onReturn', async () => {
		let returnCallCount = 0;
		const queue = new AsyncEventQueue<number>(() => {
			returnCallCount++;
		});

		queue.fail(new Error('failed'));
		await queue.return();

		expect(returnCallCount).toBe(0);
	});

	it('return discards buffered values', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.push(1);
		queue.push(2);

		await queue.return();

		expect(await queue.next()).toEqual({ done: true, value: undefined });
	});

	it('double return only calls onReturn once', async () => {
		let returnCallCount = 0;
		const queue = new AsyncEventQueue<number>(() => {
			returnCallCount++;
		});

		await queue.return();
		await queue.return();

		expect(returnCallCount).toBe(1);
	});

	it('complete after fail is a no-op', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		const pending = queue.next();

		queue.fail(new Error('failed'));
		queue.complete();

		await expect(pending).rejects.toThrow('failed');
		// subsequent next still rejects (fail state, not complete state)
		await expect(queue.next()).rejects.toThrow('failed');
	});

	it('fail after complete is a no-op', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		queue.complete();
		queue.fail(new Error('too late'));

		// still behaves as completed, not failed
		expect(await queue.next()).toEqual({ done: true, value: undefined });
	});

	it('interleaved push during for-await iteration', async () => {
		const queue = new AsyncEventQueue<number>(() => {});
		const values: number[] = [];

		// Push first two eagerly, rest will arrive while iterating
		queue.push(1);
		queue.push(2);

		const done = (async () => {
			for await (const v of queue) {
				values.push(v);
			}
		})();

		// Let the loop drain the buffered values, then push more
		await Promise.resolve();
		queue.push(3);
		await Promise.resolve();
		queue.push(4);
		queue.complete();

		await done;
		expect(values).toEqual([1, 2, 3, 4]);
	});
});
