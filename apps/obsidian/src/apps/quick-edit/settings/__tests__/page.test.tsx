// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	AuthActionProvider,
	bindHostAction,
	openExternalAction,
} from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import type { FranklinApp } from '@franklin/agent';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { QuickEditPreferences } from '../store.js';
import { quickEditSettingsCodec } from '../codec.js';
import { QuickEditSettingsPanel } from '../page.js';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('quick edit settings panel', () => {
	it('saves editing instructions and reasoning through the shared model picker', async () => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		);
		const scroll = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'scrollIntoView',
		);
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
			configurable: true,
			value: () => {},
		});
		const entries = {};
		const harness = {
			auth: {
				entries: () => entries,
				onAuthChange: () => () => {},
				getOAuthProviders: () => [],
				getApiKeyProviders: async () => [],
			},
		} as unknown as FranklinApp;
		const preferences = await QuickEditPreferences.create(
			createSingleFilePersister(
				new MemoryFilesystem(),
				toAbsolutePath('/quick-edit.json'),
				quickEditSettingsCodec,
			),
			{
				provider: 'openai-codex',
				model: 'gpt-5.4',
				reasoning: 'medium',
				instructions: 'Preserve outlines.',
			},
		);
		const shortcut = vi.fn();
		const panel = (active = true) => (
			<ApplicationProvider
				harness={harness}
				hostActionBindings={[
					bindHostAction(openExternalAction, async () => {}),
				]}
			>
				<AuthActionProvider handlers={{ requestApiKey: vi.fn() }}>
					<QuickEditSettingsPanel
						preferences={preferences}
						active={active}
						onConfigureShortcut={shortcut}
					/>
				</AuthActionProvider>
			</ApplicationProvider>
		);
		try {
			const { rerender } = render(panel());
			expect(screen.queryByRole('checkbox')).toBeNull();
			fireEvent.change(
				screen.getByRole('textbox', { name: 'Editing instructions' }),
				{ target: { value: 'Read my Outline Rules.md first.' } },
			);
			fireEvent.click(
				screen.getByRole('button', { name: 'Save editing instructions' }),
			);
			await vi.waitFor(() =>
				expect(preferences.state.get().instructions).toBe(
					'Read my Outline Rules.md first.',
				),
			);
			fireEvent.click(
				screen.getByRole('button', { name: 'Configure quick edit shortcut' }),
			);
			expect(shortcut).toHaveBeenCalledOnce();
			fireEvent.click(screen.getByRole('button', { name: 'Quick edit model' }));
			fireEvent.click(await screen.findByRole('radio', { name: 'High' }));
			await vi.waitFor(() =>
				expect(preferences.state.get().reasoning).toBe('high'),
			);
			rerender(panel(false));
			expect(screen.queryByRole('radio', { name: 'High' })).toBeNull();
			expect(
				screen.getByDisplayValue('Read my Outline Rules.md first.'),
			).toBeTruthy();
		} finally {
			await preferences.dispose();
			if (scroll)
				Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scroll);
			else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
		}
	});
});
