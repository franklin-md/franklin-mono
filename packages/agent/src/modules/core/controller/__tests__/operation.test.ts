import { describe, expect, it } from 'vitest';
import { createSessionOperation } from '../operation.js';

describe('session operation ordering', () => {
	it('waits for the requested update, including parallel tool callers', async () => {
		const operation = createSessionOperation();
		operation.begin();
		const completed: number[] = [];
		const first = operation
			.waitForUpdate('latest')
			.then(() => completed.push(1));
		const second = operation
			.waitForUpdate('latest')
			.then(() => completed.push(2));
		await Promise.resolve();
		expect(completed).toEqual([]);
		operation.recordUpdate('latest');
		await Promise.all([first, second]);
		expect(completed).toEqual([1, 2]);
		operation.end();
	});

	it('cancels a checkpoint waiting for an update', async () => {
		const operation = createSessionOperation();
		operation.begin();
		const waiting = operation.waitForUpdate('latest');
		operation.cancel();
		await expect(waiting).rejects.toThrow();
		operation.end();
	});

	it('serializes prompts and manual compaction and releases the lock on settlement', () => {
		const operation = createSessionOperation();
		operation.begin();
		expect(() => operation.begin()).toThrow('already in progress');
		operation.end();
		expect(() => operation.begin()).not.toThrow();
		operation.end();
	});
});
