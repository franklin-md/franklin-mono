// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { openQuickEditPreferences } from '../store.js';
import type { QuickEditPreferences } from '../store.js';
import { quickEditSettingsCodec } from '../codec.js';
import { QuickEditSettingsPanel } from '../page.js';

const harness = {
	auth: {
		entries: () => ({}),
		onAuthChange: () => () => {},
		getOAuthProviders: () => [],
		getApiKeyProviders: async () => [],
	},
} as unknown as FranklinApp;

// jsdom has no layout: Radix positions popovers with ResizeObserver, and the
// model list scrolls its selection into view.
beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
		configurable: true,
		value: () => {},
	});
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

async function setup() {
	const persistence = createSingleFilePersister(
		new MemoryFilesystem(),
		toAbsolutePath('/quick-edit.json'),
		quickEditSettingsCodec,
	);
	const preferences = await openQuickEditPreferences(persistence, {
		provider: 'openai-codex',
		model: 'gpt-5.4',
		reasoning: 'medium',
		instructions: 'Preserve outlines.',
	});
	return { persistence, preferences };
}

function panel(
	preferences: QuickEditPreferences,
	options: { active?: boolean; onConfigureShortcut?: () => void } = {},
) {
	return (
		<ApplicationProvider
			harness={harness}
			hostActionBindings={[bindHostAction(openExternalAction, async () => {})]}
		>
			<AuthActionProvider handlers={{ requestApiKey: vi.fn() }}>
				<QuickEditSettingsPanel
					preferences={preferences}
					active={options.active ?? true}
					onConfigureShortcut={options.onConfigureShortcut}
				/>
			</AuthActionProvider>
		</ApplicationProvider>
	);
}

function instructions() {
	return screen.getByRole<HTMLTextAreaElement>('textbox', {
		name: 'Editing instructions',
	});
}

describe('quick edit settings panel', () => {
	it('saves editing instructions, reasoning and presets', async () => {
		const { preferences } = await setup();
		const shortcut = vi.fn();
		const { rerender } = render(
			panel(preferences, { onConfigureShortcut: shortcut }),
		);
		expect(screen.queryByRole('checkbox')).toBeNull();
		fireEvent.change(instructions(), {
			target: { value: 'Read my Outline Rules.md first.' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Save instructions' }));
		await vi.waitFor(() =>
			expect(preferences.get().instructions).toBe(
				'Read my Outline Rules.md first.',
			),
		);
		fireEvent.click(
			screen.getByRole('button', { name: 'Configure quick edit shortcut' }),
		);
		expect(shortcut).toHaveBeenCalledOnce();
		fireEvent.click(screen.getByRole('button', { name: 'Quick edit model' }));
		fireEvent.click(await screen.findByRole('radio', { name: 'High' }));
		await vi.waitFor(() => expect(preferences.get().reasoning).toBe('high'));
		fireEvent.click(screen.getByRole('button', { name: 'Delete Link' }));
		await vi.waitFor(() => expect(preferences.get().presets).toEqual([]));
		rerender(panel(preferences, { active: false }));
		expect(screen.queryByRole('radio', { name: 'High' })).toBeNull();
		expect(
			screen.getByDisplayValue('Read my Outline Rules.md first.'),
		).toBeTruthy();
		await preferences.dispose();
	});

	it('shows a failed save beneath the row that made it and keeps the instructions draft', async () => {
		const { persistence, preferences } = await setup();
		render(panel(preferences));
		const save = vi.spyOn(persistence, 'save');
		save.mockRejectedValueOnce(new Error('Disk full'));
		fireEvent.click(screen.getByRole('button', { name: 'Quick edit model' }));
		await act(async () => {
			fireEvent.click(await screen.findByRole('radio', { name: 'High' }));
		});
		const [alert] = screen.getAllByRole('alert');
		expect(alert?.textContent).toBe('Disk full');
		expect(
			alert
				?.closest('.setting-item')
				?.textContent.includes('Model and reasoning'),
		).toBe(true);
		expect(preferences.get().reasoning).toBe('medium');

		save.mockRejectedValueOnce(new Error('Locked'));
		fireEvent.change(instructions(), { target: { value: 'Keep my draft.' } });
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: 'Save instructions' }),
			);
		});
		expect(
			screen.getAllByRole('alert').map((node) => node.textContent),
		).toEqual(['Disk full', 'Locked']);
		expect(instructions().value).toBe('Keep my draft.');
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: 'Save instructions' }),
			);
		});
		expect(
			screen.getAllByRole('alert').map((node) => node.textContent),
		).toEqual(['Disk full']);
		expect(preferences.get().instructions).toBe('Keep my draft.');
		await preferences.dispose();
	});
});
