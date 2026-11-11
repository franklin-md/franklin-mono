// @vitest-environment jsdom

import type {
	AppSettings,
	AuthEntries,
	FranklinApp,
	SettingsStore,
} from '@franklin/agent';
import { bindHostAction, openExternalAction } from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SettingsSection } from '../../../shared/obsidian/settings/types.js';
import { InboxController } from '../../../apps/inbox/controller/controller.js';
import { inboxCodec } from '../../../apps/inbox/controller/schema.js';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { SettingsPage } from '../page.js';

afterEach(() => {
	cleanup();
});

type AuthStub = {
	entries: () => AuthEntries;
	setApiKeyEntry: ReturnType<typeof vi.fn>;
	removeApiKeyEntry: ReturnType<typeof vi.fn>;
	getApiKeyProviders: () => Promise<string[]>;
	getOAuthProviders: () => { id: string; name: string }[];
	onAuthChange: () => () => void;
	cancel: () => Promise<void>;
};

type SettingsStub = Pick<SettingsStore, 'get' | 'set' | 'subscribe'>;

function createAuthStub(initial: AuthEntries = {}): AuthStub {
	let entries = initial;
	return {
		entries: () => entries,
		setApiKeyEntry: vi.fn((provider: string, entry) => {
			entries = { ...entries, [provider]: { apiKey: entry } };
		}),
		removeApiKeyEntry: vi.fn((provider: string) => {
			const { [provider]: _removed, ...rest } = entries;
			entries = rest;
		}),
		getApiKeyProviders: async () => ['openrouter', 'opencode-go'],
		getOAuthProviders: () => [{ id: 'openai-codex', name: 'ChatGPT' }],
		onAuthChange: () => () => {},
		cancel: async () => {},
	};
}

function createSettingsStub(
	initial: AppSettings = {
		mcpServers: [],
		documentDownloads: { idleTimeoutMs: 60_000, totalTimeoutMs: 900_000 },
		shareViewedReferencesByDefault: true,
		defaultLLMConfig: {
			provider: 'openai-codex',
			model: 'gpt-5.4',
			reasoning: 'medium',
		},
	},
): SettingsStub {
	let value = initial;
	const listeners = new Set<(value: AppSettings) => void>();
	const settings: SettingsStub = {
		get: () => value,
		set: vi.fn((recipe: Parameters<SettingsStore['set']>[0]) => {
			const draft: AppSettings = {
				...value,
				defaultLLMConfig: { ...value.defaultLLMConfig },
			};
			recipe(draft);
			value = draft;
			for (const listener of listeners) {
				listener(value);
			}
		}),
		subscribe: vi.fn((listener: (value: AppSettings) => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};
	return settings;
}

function renderPage(
	auth: AuthStub,
	settings = createSettingsStub(),
	onConfigureInboxShortcut?: () => void,
	initialSection: SettingsSection = 'connections',
	inbox?: InboxController,
) {
	const openExternal = vi.fn(async () => {});
	const app = {
		auth,
		settings,
	} as unknown as FranklinApp;

	return {
		...render(
			<ApplicationProvider
				harness={app}
				hostActionBindings={[bindHostAction(openExternalAction, openExternal)]}
			>
				<SettingsPage
					initialSection={initialSection}
					inbox={inbox}
					onConfigureInboxShortcut={onConfigureInboxShortcut}
				/>
			</ApplicationProvider>,
		),
		openExternal,
		settings,
	};
}

describe('SettingsPage', () => {
	it('shows one panel at a time and retains unfinished instructions and action drafts across tabs', async () => {
		const inbox = await InboxController.create({
			defaults: { provider: 'test', model: 'test', reasoning: 'off' },
			persistence: createSingleFilePersister(
				new MemoryFilesystem(),
				toAbsolutePath('/inbox.json'),
				inboxCodec,
			),
			run: vi.fn(),
		});
		renderPage(createAuthStub(), undefined, undefined, 'general', inbox);
		expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
			'General',
			'Inbox',
			'Flashcards',
			'Connections',
		]);
		expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
		const select = (name: string) =>
			fireEvent.mouseDown(screen.getByRole('tab', { name }), {
				button: 0,
				ctrlKey: false,
			});
		select('Inbox');
		fireEvent.change(
			screen.getByRole('textbox', { name: 'Answer instructions' }),
			{ target: { value: 'Unfinished instructions' } },
		);
		fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
		fireEvent.change(screen.getByRole('textbox', { name: 'Action prompt' }), {
			target: { value: 'Unfinished action' },
		});
		select('Connections');
		expect(
			screen.queryByRole('textbox', { name: 'Answer instructions' }),
		).toBeNull();
		expect(
			screen
				.getByLabelText('Answer instructions')
				.closest('[role="tabpanel"]')
				?.hasAttribute('hidden'),
		).toBe(true);
		select('Inbox');
		expect(
			screen.getByRole<HTMLTextAreaElement>('textbox', {
				name: 'Answer instructions',
			}).value,
		).toBe('Unfinished instructions');
		expect(
			screen.getByRole<HTMLTextAreaElement>('textbox', {
				name: 'Action prompt',
			}).value,
		).toBe('Unfinished action');
		expect(inbox.state.get().actions).toEqual([]);
		await inbox.dispose();
	});

	it('edits document download timing and rejects invalid input without changing saved values', () => {
		const { settings } = renderPage(
			createAuthStub(),
			undefined,
			undefined,
			'general',
		);
		const idle = screen.getByLabelText<HTMLInputElement>(
			'Download inactivity timeout (seconds)',
		);
		const total = screen.getByLabelText<HTMLInputElement>(
			'Maximum download duration (minutes)',
		);
		expect(idle.value).toBe('60');
		expect(total.value).toBe('15');
		fireEvent.change(idle, { target: { value: '120' } });
		fireEvent.blur(idle);
		fireEvent.change(total, { target: { value: '20' } });
		fireEvent.blur(total);
		expect(settings.get().documentDownloads).toEqual({
			idleTimeoutMs: 120_000,
			totalTimeoutMs: 1_200_000,
		});
		fireEvent.change(idle, { target: { value: '0' } });
		fireEvent.blur(idle);
		expect(screen.getByRole('alert')).toBeTruthy();
		expect(settings.get().documentDownloads.idleTimeoutMs).toBe(120_000);
	});

	it('offers the selection capture shortcut in the study inbox settings', () => {
		const configure = vi.fn();
		renderPage(createAuthStub(), createSettingsStub(), configure, 'inbox');
		expect(screen.getByText('Study inbox')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Configure shortcut' }));
		expect(configure).toHaveBeenCalledOnce();
	});

	it('seeds the OpenRouter input from the existing auth entry', () => {
		const auth = createAuthStub({
			openrouter: { apiKey: { type: 'apiKey', key: 'sk-or-existing' } },
		});

		renderPage(auth);

		const input = screen.getByLabelText<HTMLInputElement>('OpenRouter API key');
		expect(input.value).toBe('sk-or-existing');
	});

	it('seeds the OpenCode Go input from the existing auth entry', () => {
		const auth = createAuthStub({
			'opencode-go': { apiKey: { type: 'apiKey', key: 'oc-existing' } },
		});

		renderPage(auth);

		const input = screen.getByLabelText<HTMLInputElement>(
			'OpenCode Go API key',
		);
		expect(input.value).toBe('oc-existing');
	});

	it('seeds the Mistral input from the existing auth entry', () => {
		const auth = createAuthStub({
			mistral: { apiKey: { type: 'apiKey', key: 'mis-existing' } },
		});

		renderPage(auth);

		const input = screen.getByLabelText<HTMLInputElement>('Mistral API key');
		expect(input.value).toBe('mis-existing');
	});

	it('renders provider logos beside credential settings', () => {
		const auth = createAuthStub();
		const { container } = renderPage(auth);

		expect(container.querySelectorAll('.setting-item-name svg')).toHaveLength(
			4,
		);
	});

	it('renders settings under native setting group headings', () => {
		const auth = createAuthStub();
		const { container } = renderPage(auth);

		const headings = Array.from(
			container.querySelectorAll('.setting-item-heading .setting-item-name'),
			(element) => element.textContent,
		);

		expect(headings).toEqual(['Context', 'Document downloads', 'Accounts']);
	});

	it('renders ChatGPT as the first credential setting', () => {
		const auth = createAuthStub();
		renderPage(auth);

		expect(
			screen
				.getByRole('tabpanel')
				.querySelector(
					'.setting-item:not(.setting-item-heading) .setting-item-name',
				)?.textContent,
		).toBe('ChatGPT');
	});

	it('links to OpenRouter API key settings', () => {
		const auth = createAuthStub();
		const { openExternal } = renderPage(auth);

		const link = screen.getByRole('link', {
			name: 'OpenRouter API keys',
		});
		expect(link.getAttribute('href')).toBe(
			'https://openrouter.ai/settings/keys',
		);
		expect(link.getAttribute('target')).toBe('_blank');

		fireEvent.click(link);
		expect(openExternal).toHaveBeenCalledWith(
			'https://openrouter.ai/settings/keys',
		);
	});

	it('links to OpenCode API key settings', () => {
		const auth = createAuthStub();
		const { openExternal } = renderPage(auth);

		const link = screen.getByRole('link', {
			name: 'OpenCode API keys',
		});
		expect(link.getAttribute('href')).toBe('https://opencode.ai/auth');
		expect(link.getAttribute('target')).toBe('_blank');

		fireEvent.click(link);
		expect(openExternal).toHaveBeenCalledWith('https://opencode.ai/auth');
	});

	it('links to Mistral API key settings', () => {
		const auth = createAuthStub();
		const { openExternal } = renderPage(auth);

		const link = screen.getByRole('link', {
			name: 'Mistral API keys',
		});
		expect(link.getAttribute('href')).toBe(
			'https://console.mistral.ai/api-keys',
		);
		expect(link.getAttribute('target')).toBe('_blank');

		fireEvent.click(link);
		expect(openExternal).toHaveBeenCalledWith(
			'https://console.mistral.ai/api-keys',
		);
	});

	it('writes the OpenRouter key into the auth manager on change', () => {
		const auth = createAuthStub();
		renderPage(auth);

		const input = screen.getByLabelText('OpenRouter API key');
		fireEvent.change(input, { target: { value: '  sk-or-new  ' } });

		expect(auth.setApiKeyEntry).toHaveBeenCalledWith('openrouter', {
			type: 'apiKey',
			key: 'sk-or-new',
		});
	});

	it('writes the OpenCode Go key into the auth manager on change', () => {
		const auth = createAuthStub();
		renderPage(auth);

		const input = screen.getByLabelText('OpenCode Go API key');
		fireEvent.change(input, { target: { value: '  oc-new  ' } });

		expect(auth.setApiKeyEntry).toHaveBeenCalledWith('opencode-go', {
			type: 'apiKey',
			key: 'oc-new',
		});
	});

	it('writes the Mistral key into the auth manager on change', () => {
		const auth = createAuthStub();
		renderPage(auth);

		const input = screen.getByLabelText('Mistral API key');
		fireEvent.change(input, { target: { value: '  mis-new  ' } });

		expect(auth.setApiKeyEntry).toHaveBeenCalledWith('mistral', {
			type: 'apiKey',
			key: 'mis-new',
		});
	});

	it('clears the OpenRouter entry when the input is emptied', () => {
		const auth = createAuthStub({
			openrouter: { apiKey: { type: 'apiKey', key: 'sk-or-existing' } },
		});
		renderPage(auth);

		const input = screen.getByLabelText('OpenRouter API key');
		fireEvent.change(input, { target: { value: '   ' } });

		expect(auth.removeApiKeyEntry).toHaveBeenCalledWith('openrouter');
	});

	it('clears the OpenCode Go entry when the input is emptied', () => {
		const auth = createAuthStub({
			'opencode-go': { apiKey: { type: 'apiKey', key: 'oc-existing' } },
		});
		renderPage(auth);

		const input = screen.getByLabelText('OpenCode Go API key');
		fireEvent.change(input, { target: { value: '   ' } });

		expect(auth.removeApiKeyEntry).toHaveBeenCalledWith('opencode-go');
	});

	it('clears the Mistral entry when the input is emptied', () => {
		const auth = createAuthStub({
			mistral: { apiKey: { type: 'apiKey', key: 'mis-existing' } },
		});
		renderPage(auth);

		const input = screen.getByLabelText('Mistral API key');
		fireEvent.change(input, { target: { value: '   ' } });

		expect(auth.removeApiKeyEntry).toHaveBeenCalledWith('mistral');
	});

	it('renders a ChatGPT login button', () => {
		const auth = createAuthStub();
		renderPage(auth);

		expect(screen.getByRole('button', { name: /chatgpt/i })).toBeTruthy();
	});

	it('shares open notes with agents by default', () => {
		const auth = createAuthStub();
		renderPage(auth, undefined, undefined, 'general');

		const input = screen.getByRole('switch', {
			name: 'Share open notes with agent',
		});
		expect(input.getAttribute('aria-checked')).toBe('true');
	});

	it('writes the open notes sharing default into settings on change', () => {
		const auth = createAuthStub();
		const { settings } = renderPage(auth, undefined, undefined, 'general');

		const input = screen.getByRole('switch', {
			name: 'Share open notes with agent',
		});
		fireEvent.click(input);

		expect(settings.set).toHaveBeenCalledOnce();
		expect(settings.get().shareViewedReferencesByDefault).toBe(false);
	});
});
