import { describe, it, expect, vi } from 'vitest';
import type { Filesystem } from '@franklin/lib';
import type { AppSettings } from '../settings/types.js';
import {
	createSettings,
	loadSettings,
	addPersistOnChange,
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
		const store = createSettings();
		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});
});

// ---------------------------------------------------------------------------
// loadSettings
// ---------------------------------------------------------------------------

describe('loadSettings', () => {
	it('hydrates the store from disk', async () => {
		const stored: AppSettings = {
			defaultLLMConfig: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
		};
		const fs = mockFilesystem(stored);
		const store = createSettings();

		await loadSettings(store, fs);

		expect(store.get()).toEqual(stored);
		expect(fs.readFile).toHaveBeenCalledWith(DEFAULT_SETTINGS_PATH);
	});

	it('keeps default state when no file exists', async () => {
		const fs = mockFilesystem(); // readFile throws
		const store = createSettings();

		await loadSettings(store, fs);

		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});

	it('applies defaults when the stored file is empty', async () => {
		const fs = mockFilesystem({} as AppSettings);
		const store = createSettings();

		await loadSettings(store, fs);

		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});
});

// ---------------------------------------------------------------------------
// addPersistOnChange
// ---------------------------------------------------------------------------

describe('addPersistOnChange', () => {
	it('writes to disk on every store change', () => {
		const fs = mockFilesystem();
		const store = createSettings();
		addPersistOnChange(store, fs);

		store.set(() => ({
			defaultLLMConfig: { provider: 'openai', model: 'gpt-4o' },
		}));

		expect(fs.writeFile).toHaveBeenCalledWith(
			DEFAULT_SETTINGS_PATH,
			expect.stringContaining('"openai"'),
		);
	});

	it('returns an unsubscribe function', () => {
		const fs = mockFilesystem();
		const store = createSettings();
		const unsub = addPersistOnChange(store, fs);

		unsub();

		store.set(() => ({
			defaultLLMConfig: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
		}));

		expect(fs.writeFile).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Store reactivity (BaseStore behavior)
// ---------------------------------------------------------------------------

describe('settings store reactivity', () => {
	it('notifies subscribers on set', () => {
		const store = createSettings();
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
		const store = createSettings();
		const listener = vi.fn();
		store.subscribe(listener);

		// Returning the same draft keeps the store value unchanged.
		store.set((draft) => draft);

		expect(listener).not.toHaveBeenCalled();
	});
});
