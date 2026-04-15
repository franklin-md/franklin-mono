import { describe, it, expect, vi } from 'vitest';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import type { AppSettings } from '../settings/types.js';
import {
	createSettings,
	DEFAULT_SETTINGS_PATH,
	DEFAULT_APP_SETTINGS,
} from '../settings/store.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFilesystem(stored?: AppSettings): Filesystem {
	return {
		readFile: vi.fn(async () => {
			if (!stored) throw new Error('ENOENT');
			return new TextEncoder().encode(JSON.stringify(stored));
		}),
		writeFile: vi.fn(async () => {}),
		resolve: vi.fn(),
		mkdir: vi.fn(),
		access: vi.fn(),
		stat: vi.fn(),
		readdir: vi.fn(),
		exists: vi.fn(),
		glob: vi.fn(),
		deleteFile: vi.fn(),
	} as unknown as Filesystem;
}

// ---------------------------------------------------------------------------
// createSettings
// ---------------------------------------------------------------------------

describe('createSettings', () => {
	it('creates a store with default llm config', () => {
		const store = createSettings(mockFilesystem());
		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});
});

// ---------------------------------------------------------------------------
// restore
// ---------------------------------------------------------------------------

describe('settings.restore', () => {
	it('hydrates the store from disk', async () => {
		const stored: AppSettings = {
			defaultLLMConfig: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
		};
		const fs = mockFilesystem(stored);
		const store = createSettings(fs);

		await store.restore();

		expect(store.get()).toEqual(stored);
		expect(fs.readFile).toHaveBeenCalledWith(DEFAULT_SETTINGS_PATH);
		expect(fs.writeFile).not.toHaveBeenCalled();
	});

	it('keeps default state when no file exists', async () => {
		const fs = mockFilesystem(); // readFile throws
		const store = createSettings(fs);

		await store.restore();

		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});

	it('applies defaults when the stored file is empty', async () => {
		const fs = mockFilesystem({} as AppSettings);
		const store = createSettings(fs);

		await store.restore();

		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});
});

// ---------------------------------------------------------------------------
// persistence
// ---------------------------------------------------------------------------

describe('settings persistence', () => {
	it('writes to disk on every store change', () => {
		const fs = mockFilesystem();
		const store = createSettings(fs);

		store.set(() => ({
			defaultLLMConfig: { provider: 'openai', model: 'gpt-4o' },
		}));

		expect(fs.writeFile).toHaveBeenCalledWith(
			DEFAULT_SETTINGS_PATH,
			expect.stringContaining('"openai"'),
		);
	});

	it('supports manual persistence', async () => {
		const fs = mockFilesystem();
		const store = createSettings(fs);

		store.set(() => ({
			defaultLLMConfig: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
		}));
		vi.mocked(fs.writeFile).mockClear();

		await store.persist();

		expect(fs.writeFile).toHaveBeenCalledWith(
			DEFAULT_SETTINGS_PATH,
			expect.stringContaining('"anthropic"'),
		);
	});
});

// ---------------------------------------------------------------------------
// Store reactivity (BaseStore behavior)
// ---------------------------------------------------------------------------

describe('settings store reactivity', () => {
	it('notifies subscribers on set', () => {
		const store = createSettings(mockFilesystem());
		const listener = vi.fn();
		store.subscribe(listener);

		store.set(() => ({
			defaultLLMConfig: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
		}));

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultLLMConfig: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
			}),
		);
	});

	it('does not notify when value is unchanged', () => {
		const store = createSettings(mockFilesystem());
		const listener = vi.fn();
		store.subscribe(listener);

		// Returning the same draft keeps the store value unchanged.
		store.set((draft) => draft);

		expect(listener).not.toHaveBeenCalled();
	});
});
