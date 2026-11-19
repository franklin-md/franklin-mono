import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
	versioned,
	zodCodec,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { openSettingsFile } from '../open.js';

const schema = z.object({
	model: z.string().min(1),
	instructions: z.string(),
	items: z
		.array(z.string())
		.refine((items) => new Set(items).size === items.length),
});
const codec = versioned().version(1, zodCodec(schema)).build();
const defaults = { model: 'first', instructions: 'Keep outlines.', items: [] };
const path = toAbsolutePath('/settings.json');

function setup() {
	const fs = new MemoryFilesystem();
	const persistence = createSingleFilePersister(fs, path, codec);
	const open = () =>
		openSettingsFile({ name: 'test settings', persistence, schema, defaults });
	const read = async () =>
		JSON.parse(new TextDecoder().decode(await fs.readFile(path))) as unknown;
	return { fs, persistence, open, read };
}

describe('settings file', () => {
	it('saves concurrent updates to separate fields and restores them', async () => {
		const { open } = setup();
		const settings = await open();
		await Promise.all([
			settings.configure({ model: 'second' }),
			settings.configure({ instructions: 'Keep my wording.' }),
		]);
		expect((await open()).get()).toEqual({
			model: 'second',
			instructions: 'Keep my wording.',
			items: [],
		});
	});

	it('applies each queued update to the result of the one before it', async () => {
		const { open } = setup();
		const settings = await open();
		const add = (item: string) =>
			settings.configure((current) => ({ items: [...current.items, item] }));
		await Promise.all([add('a'), add('b')]);
		expect((await open()).get().items).toEqual(['a', 'b']);
	});

	it('publishes only saved values and accepts updates after a failed write', async () => {
		const { open, persistence } = setup();
		const settings = await open();
		const seen = vi.fn();
		settings.subscribe(seen);
		vi.spyOn(persistence, 'save').mockRejectedValueOnce(new Error('disk full'));
		await expect(settings.configure({ model: 'lost' })).rejects.toThrow(
			'disk full',
		);
		expect(settings.get().model).toBe('first');
		expect(seen).not.toHaveBeenCalled();
		await settings.configure({ model: 'kept' });
		expect(settings.get().model).toBe('kept');
		expect((await open()).get().model).toBe('kept');
	});

	it('rejects invalid settings without writing them', async () => {
		const { open, read } = setup();
		const settings = await open();
		await settings.configure({ items: ['a'] });
		await expect(settings.configure({ items: ['a', 'a'] })).rejects.toThrow();
		expect(settings.get().items).toEqual(['a']);
		expect(await read()).toEqual({
			version: 1,
			data: { ...defaults, items: ['a'] },
		});
	});

	it('preserves an unreadable file instead of replacing it with defaults', async () => {
		const { fs, open } = setup();
		await fs.writeFile(path, '{broken');
		await expect(open()).rejects.toThrow(
			'Could not load test settings; saved settings were preserved',
		);
		expect(new TextDecoder().decode(await fs.readFile(path))).toBe('{broken');
	});

	it('finishes accepted writes on dispose and then refuses updates', async () => {
		const { open, read } = setup();
		const settings = await open();
		const saved = settings.configure({ model: 'second' });
		await settings.dispose();
		expect(await read()).toEqual({
			version: 1,
			data: { ...defaults, model: 'second' },
		});
		await expect(saved).resolves.toBeUndefined();
		await expect(settings.configure({ model: 'late' })).rejects.toThrow(
			'closed',
		);
	});

	it('can be passed on without its owner', async () => {
		const { open } = setup();
		const { configure, get } = await open();
		await configure({ model: 'second' });
		expect(get().model).toBe('second');
	});
});
