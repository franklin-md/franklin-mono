import { describe, it, expect, vi } from 'vitest';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';
import type { AppSettings } from '../settings/schema.js';
import {
	createSettings,
	DEFAULT_SETTINGS_FILE,
	DEFAULT_APP_SETTINGS,
} from '../settings/store.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_APP_DIR = '/test/app' as AbsolutePath;
const SETTINGS_PATH = joinAbsolute(TEST_APP_DIR, DEFAULT_SETTINGS_FILE);

function mockFilesystem(stored?: AppSettings): Filesystem {
	return {
		readFile: vi.fn(async () => {
			if (stored === undefined) throw new Error('ENOENT');
			const envelope = { version: 1, data: stored };
			return new TextEncoder().encode(JSON.stringify(envelope));
		}),
		writeFile: vi.fn(async () => {}),
		resolve: vi.fn(
			async (...paths: string[]) => paths.join('/') as AbsolutePath,
		),
		mkdir: vi.fn(),
		access: vi.fn(),
		stat: vi.fn(),
		readdir: vi.fn(),
		exists: vi.fn(async () => stored !== undefined),
		glob: vi.fn(),
		deleteFile: vi.fn(),
	} as unknown as Filesystem;
}

// ---------------------------------------------------------------------------
// createSettings
// ---------------------------------------------------------------------------

describe('createSettings', () => {
	it('creates a store with default llm config', () => {
		const store = createSettings(mockFilesystem(), TEST_APP_DIR);
		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});
});

// ---------------------------------------------------------------------------
// restore
// ---------------------------------------------------------------------------

describe('settings.restore', () => {
	it('hydrates the store from disk', async () => {
		const stored: AppSettings = {
			defaultLLMConfig: {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				reasoning: 'high',
			},
		};
		const fs = mockFilesystem(stored);
		const store = createSettings(fs, TEST_APP_DIR);

		await store.restore();

		expect(store.get()).toEqual(stored);
		expect(fs.readFile).toHaveBeenCalledWith(SETTINGS_PATH);
		expect(fs.writeFile).not.toHaveBeenCalled();
	});

	it('partial disk data: missing fields filled from schema defaults', async () => {
		const fs = mockFilesystem({
			defaultLLMConfig: {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
			} as AppSettings['defaultLLMConfig'],
		});
		const store = createSettings(fs, TEST_APP_DIR);

		await store.restore();

		expect(store.get()).toEqual({
			defaultLLMConfig: {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				reasoning: 'medium',
			},
		});
	});

	it('keeps default state when no file exists', async () => {
		const fs = mockFilesystem(); // readFile throws
		const store = createSettings(fs, TEST_APP_DIR);

		await store.restore();

		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});

	it('applies defaults when the stored file is empty', async () => {
		const fs = mockFilesystem({} as AppSettings);
		const store = createSettings(fs, TEST_APP_DIR);

		await store.restore();

		expect(store.get()).toEqual(DEFAULT_APP_SETTINGS);
	});
});

// ---------------------------------------------------------------------------
// persistence
// ---------------------------------------------------------------------------

describe('settings persistence', () => {
	it('writes to disk on every store change', async () => {
		const fs = mockFilesystem();
		const store = createSettings(fs, TEST_APP_DIR);

		store.set(() => ({
			defaultLLMConfig: {
				provider: 'openai',
				model: 'gpt-4o',
				reasoning: 'medium',
			},
		}));

		// persist is triggered asynchronously via the store subscription
		await vi.waitFor(() => {
			expect(fs.writeFile).toHaveBeenCalledWith(
				SETTINGS_PATH,
				expect.stringContaining('"openai"'),
			);
		});
	});

	it('supports manual persistence', async () => {
		const fs = mockFilesystem();
		const store = createSettings(fs, TEST_APP_DIR);

		store.set(() => ({
			defaultLLMConfig: {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				reasoning: 'medium',
			},
		}));
		vi.mocked(fs.writeFile).mockClear();

		await store.persist();

		expect(fs.writeFile).toHaveBeenCalledWith(
			SETTINGS_PATH,
			expect.stringContaining('"anthropic"'),
		);
	});
});

// ---------------------------------------------------------------------------
// Store reactivity (BaseStore behavior)
// ---------------------------------------------------------------------------

describe('settings store reactivity', () => {
	it('notifies subscribers on set', () => {
		const store = createSettings(mockFilesystem(), TEST_APP_DIR);
		const listener = vi.fn();
		store.subscribe(listener);

		store.set(() => ({
			defaultLLMConfig: {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				reasoning: 'medium',
			},
		}));

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultLLMConfig: {
					provider: 'anthropic',
					model: 'claude-sonnet-4-5',
					reasoning: 'medium',
				},
			}),
		);
	});

	it('does not notify when value is unchanged', () => {
		const store = createSettings(mockFilesystem(), TEST_APP_DIR);
		const listener = vi.fn();
		store.subscribe(listener);

		// Returning the same draft keeps the store value unchanged.
		store.set((draft: AppSettings) => draft);

		expect(listener).not.toHaveBeenCalled();
	});
});
