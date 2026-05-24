import { describe, it, expect } from 'vitest';
import {
	applySetPart,
	createSlot,
	resolveSlotContent,
} from '../assembler/slot.js';

describe('createSlot', () => {
	it('starts empty, unpinned, and non-cache', () => {
		expect(createSlot()).toEqual({
			content: undefined,
			cache: false,
			pinned: false,
		});
	});
});

describe('applySetPart', () => {
	it('is a no-op on metadata when opts is undefined', () => {
		const slot = createSlot();
		applySetPart(slot, undefined);
		expect(slot).toMatchObject({ cache: false, pinned: false });
	});

	it('sets cache when opts.cache is true', () => {
		const slot = createSlot();
		applySetPart(slot, { cache: true });
		expect(slot.cache).toBe(true);
		expect(slot.pinned).toBe(false);
	});

	it('pins the slot and defaults cache to true when opts.once is true', () => {
		const slot = createSlot();
		applySetPart(slot, { once: true });
		expect(slot.pinned).toBe(true);
		expect(slot.cache).toBe(true);
	});

	it('honors explicit { once: true, cache: false }', () => {
		const slot = createSlot();
		applySetPart(slot, { once: true, cache: false });
		expect(slot.pinned).toBe(true);
		expect(slot.cache).toBe(false);
	});
});

describe('resolveSlotContent', () => {
	it('writes a string fragment directly', async () => {
		const slot = createSlot();
		await resolveSlotContent(slot, 'literal');
		expect(slot.content).toBe('literal');
	});

	it('invokes a sync factory and writes the result', async () => {
		const slot = createSlot();
		await resolveSlotContent(slot, () => 'from-sync-factory');
		expect(slot.content).toBe('from-sync-factory');
	});

	it('awaits an async factory and writes the result', async () => {
		const slot = createSlot();
		await resolveSlotContent(slot, async () => 'from-async-factory');
		expect(slot.content).toBe('from-async-factory');
	});
});
