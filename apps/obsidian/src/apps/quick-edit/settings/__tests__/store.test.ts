import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { QuickEditPreferences } from '../store.js';
import { quickEditSettingsCodec } from '../codec.js';
import { createDefaultPresets } from '../../presets/defaults.js';
import type { QuickEditSettings } from '../../types.js';

const defaults: QuickEditSettings = {
	provider: 'test',
	model: 'first',
	reasoning: 'medium',
	instructions: 'Keep outlines.',
	presets: createDefaultPresets(),
};

describe('quick edit preferences', () => {
	it('seeds old settings with presets and preserves customized order, icons and colors after reload', async () => {
		const fs = new MemoryFilesystem();
		const path = toAbsolutePath('/quick-edit.json');
		await fs.writeFile(path, JSON.stringify({ version: 1, data: defaults }));
		const storage = createSingleFilePersister(fs, path, quickEditSettingsCodec);
		const settings = await QuickEditPreferences.create(storage, defaults);
		expect(settings.state.get().presets.map((preset) => preset.name)).toEqual([
			'Expand',
			'Add example',
			'Condense',
			'Outline',
		]);
		const presets = [
			{
				id: 'custom',
				name: 'Explain',
				prompt: 'Explain this.',
				icon: 'flask' as const,
				color: 'purple' as const,
			},
		];
		await settings.configure({ presets });
		const restored = await QuickEditPreferences.create(storage, defaults);
		expect(restored.state.get().presets).toEqual(presets);
		await settings.configure({ presets: [] });
		expect(
			(await QuickEditPreferences.create(storage, defaults)).state.get()
				.presets,
		).toEqual([]);
		await expect(
			settings.configure({ presets: [...presets, ...presets] }),
		).rejects.toThrow();
	});
	it('discards the retired hints preference when loading and saving old settings', async () => {
		const fs = new MemoryFilesystem();
		const path = toAbsolutePath('/quick-edit.json');
		const storage = createSingleFilePersister(fs, path, quickEditSettingsCodec);
		const current = defaults;
		await fs.writeFile(
			path,
			JSON.stringify({ version: 1, data: { ...current, showHints: true } }),
		);
		const settings = await QuickEditPreferences.create(storage, defaults);
		expect(settings.state.get()).toEqual(current);
		await settings.configure({ model: 'second' });
		expect(
			JSON.parse(new TextDecoder().decode(await fs.readFile(path))),
		).toEqual({ version: 2, data: { ...current, model: 'second' } });
	});
	it('persists independent model, reasoning and instruction settings across reloads', async () => {
		const storage = createSingleFilePersister(
			new MemoryFilesystem(),
			toAbsolutePath('/quick-edit.json'),
			quickEditSettingsCodec,
		);
		const settings = await QuickEditPreferences.create(storage, defaults);
		await Promise.all([
			settings.configure({ model: 'second' }),
			settings.configure({
				reasoning: 'high',
				instructions: 'Keep my wording.',
			}),
		]);
		const restored = await QuickEditPreferences.create(storage, defaults);
		expect(restored.state.get()).toEqual({
			...defaults,
			model: 'second',
			reasoning: 'high',
			instructions: 'Keep my wording.',
		});
		expect(defaults.model).toBe('first');
	});

	it('publishes only successful saves and preserves unreadable settings', async () => {
		const fs = new MemoryFilesystem();
		const path = toAbsolutePath('/quick-edit.json');
		const storage = createSingleFilePersister(fs, path, quickEditSettingsCodec);
		const settings = await QuickEditPreferences.create(storage, defaults);
		vi.spyOn(storage, 'save').mockRejectedValueOnce(new Error('disk full'));
		await expect(settings.configure({ model: 'lost' })).rejects.toThrow(
			'disk full',
		);
		expect(settings.state.get().model).toBe('first');
		await fs.writeFile(path, '{broken');
		await expect(
			QuickEditPreferences.create(storage, defaults),
		).rejects.toThrow('preserved');
		expect(new TextDecoder().decode(await fs.readFile(path))).toBe('{broken');
	});
});
