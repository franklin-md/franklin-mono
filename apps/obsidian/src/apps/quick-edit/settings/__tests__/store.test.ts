import { createSingleFilePersister, MemoryFilesystem, toAbsolutePath } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { QuickEditPreferences } from '../store.js';
import { quickEditSettingsCodec } from '../schema.js';
import type { QuickEditSettings } from '../../types.js';

const defaults: QuickEditSettings = { provider: 'test', model: 'first', reasoning: 'medium', instructions: 'Keep outlines.' };

describe('quick edit preferences', () => {
	it('persists independent model, reasoning and instruction settings across reloads', async () => {
		const storage = createSingleFilePersister(new MemoryFilesystem(), toAbsolutePath('/quick-edit.json'), quickEditSettingsCodec);
		const settings = await QuickEditPreferences.create(storage, defaults);
		await Promise.all([settings.configure({ model: 'second' }), settings.configure({ reasoning: 'high', instructions: 'Keep my wording.' })]);
		const restored = await QuickEditPreferences.create(storage, defaults);
		expect(restored.state.get()).toEqual({ ...defaults, model: 'second', reasoning: 'high', instructions: 'Keep my wording.' });
		expect(defaults.model).toBe('first');
	});

	it('publishes only successful saves and preserves unreadable settings', async () => {
		const fs = new MemoryFilesystem();
		const path = toAbsolutePath('/quick-edit.json');
		const storage = createSingleFilePersister(fs, path, quickEditSettingsCodec);
		const settings = await QuickEditPreferences.create(storage, defaults);
		vi.spyOn(storage, 'save').mockRejectedValueOnce(new Error('disk full'));
		await expect(settings.configure({ model: 'lost' })).rejects.toThrow('disk full');
		expect(settings.state.get().model).toBe('first');
		await fs.writeFile(path, '{broken');
		await expect(QuickEditPreferences.create(storage, defaults)).rejects.toThrow('preserved');
		expect(new TextDecoder().decode(await fs.readFile(path))).toBe('{broken');
	});
});
