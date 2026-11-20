import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { describe, expect, it } from 'vitest';
import { openQuickEditPreferences } from '../store.js';
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
	it('preserves max reasoning when preferences reload', async () => {
		const storage = createSingleFilePersister(
			new MemoryFilesystem(),
			toAbsolutePath('/quick-edit.json'),
			quickEditSettingsCodec,
		);
		const settings = await openQuickEditPreferences(storage, defaults);
		await settings.configure({ reasoning: 'max' });
		const restored = await openQuickEditPreferences(storage, defaults);
		expect(restored.get().reasoning).toBe('max');
	});

	it('seeds old settings with presets and preserves customized order, icons and colors after reload', async () => {
		const fs = new MemoryFilesystem();
		const path = toAbsolutePath('/quick-edit.json');
		await fs.writeFile(path, JSON.stringify({ version: 1, data: defaults }));
		const storage = createSingleFilePersister(fs, path, quickEditSettingsCodec);
		const settings = await openQuickEditPreferences(storage, defaults);
		expect(settings.get().presets.map((preset) => preset.name)).toEqual([
			'Link',
		]);
		const presets = [
			{
				id: 'custom',
				name: 'Explain',
				prompt: 'Explain this.',
				icon: 'lucide-flask-conical',
				color: 'purple' as const,
			},
		];
		await settings.configure({ presets });
		const restored = await openQuickEditPreferences(storage, defaults);
		expect(restored.get().presets).toEqual(presets);
		await settings.configure({ presets: [] });
		expect(
			(await openQuickEditPreferences(storage, defaults)).get().presets,
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
		const settings = await openQuickEditPreferences(storage, defaults);
		expect(settings.get()).toEqual(current);
		await settings.configure({ model: 'second' });
		expect(
			JSON.parse(new TextDecoder().decode(await fs.readFile(path))),
		).toEqual({ version: 4, data: { ...current, model: 'second' } });
	});
});
