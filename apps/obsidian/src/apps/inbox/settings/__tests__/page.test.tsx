// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import {
	AuthActionProvider,
	bindHostAction,
	openExternalAction,
} from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import type { FranklinApp } from '@franklin/agent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboxController } from '../../controller/index.js';
import type { AnswerRequest } from '../../controller/types.js';
import { createInboxCodecPersistence } from '../../testing/persistence.js';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../../answer-instructions.js';
import { InboxSettings } from '../page.js';

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
	const persistence = createInboxCodecPersistence();
	const run = vi.fn(async ({ submit }: AnswerRequest) => {
		await submit('An answer');
	});
	const options = {
		defaults: { provider: 'test', model: 'test', reasoning: 'medium' as const },
		persistence,
		run,
	};
	const inbox = await InboxController.create(options);
	return { inbox, persistence, options, run };
}

function renderSettings(inbox: InboxController) {
	return render(
		<ApplicationProvider
			harness={harness}
			hostActionBindings={[bindHostAction(openExternalAction, async () => {})]}
		>
			<AuthActionProvider handlers={{ requestApiKey: vi.fn() }}>
				<InboxSettings inbox={inbox} />
			</AuthActionProvider>
		</ApplicationProvider>,
	);
}

function trigger() {
	return screen.getByRole('button', { name: 'Inbox model' });
}

async function chooseReasoning(label: string) {
	if (!screen.queryByRole('radio', { name: label })) fireEvent.click(trigger());
	await act(async () => {
		fireEvent.click(await screen.findByRole('radio', { name: label }));
	});
}

describe('inbox model and reasoning setting', () => {
	it('shows the saved selection, persists a change across restarts and reflects external settings changes', async () => {
		const { inbox, persistence, options } = await setup();
		const { unmount } = renderSettings(inbox);
		expect(trigger().getAttribute('title')).toBe('test · test · Medium');
		await chooseReasoning('High');
		expect((await persistence.settings.load()).value?.reasoning).toBe('high');
		unmount();
		await inbox.dispose();
		const restored = await InboxController.create(options);
		renderSettings(restored);
		expect(trigger().getAttribute('title')).toBe('test · test · High');
		await act(async () => {
			await restored.settings.configure({ reasoning: 'low' });
		});
		expect(trigger().getAttribute('title')).toBe('test · test · Low');
		await restored.dispose();
	});

	it('applies the selection to new questions and follow-ups while retries retain the original level', async () => {
		const { inbox, run } = await setup();
		renderSettings(inbox);
		run.mockRejectedValueOnce(new Error('Retry question'));
		const original = await inbox.add('Original question');
		await vi.waitFor(() =>
			expect(
				inbox.state.get().questions.find((q) => q.id === original)?.state.kind,
			).toBe('failed'),
		);
		await chooseReasoning('High');
		await inbox.retry(original);
		await vi.waitFor(() =>
			expect(
				inbox.state.get().questions.find((q) => q.id === original)?.state.kind,
			).toBe('answered'),
		);
		const next = await inbox.add('New question');
		const child = await inbox.add('Follow-up', { parentId: original });
		await vi.waitFor(() =>
			expect(
				inbox.state.get().questions.every((q) => q.state.kind === 'answered'),
			).toBe(true),
		);
		expect(
			run.mock.calls.map(([request]) => request.question.reasoning),
		).toEqual(['medium', 'medium', 'high', 'high']);
		expect(
			inbox.state.get().questions.find((q) => q.id === next)?.reasoning,
		).toBe('high');
		expect(
			inbox.state.get().questions.find((q) => q.id === child)?.reasoning,
		).toBe('high');
		await inbox.dispose();
	});

	it('reports a failed save once, keeps the saved level and saves the next selection', async () => {
		const { inbox, persistence } = await setup();
		renderSettings(inbox);
		vi.spyOn(persistence.settings, 'save').mockRejectedValueOnce(
			new Error('Disk full'),
		);
		await chooseReasoning('Extra high');
		expect(
			screen.getAllByRole('alert').map((alert) => alert.textContent),
		).toEqual(['Disk full']);
		// The error belongs to the model row, not the page.
		expect(
			trigger().closest('.setting-item')?.contains(screen.getByRole('alert')),
		).toBe(true);
		expect(trigger().getAttribute('title')).toBe('test · test · Medium');
		expect(inbox.state.get().storageError).toBeUndefined();
		await chooseReasoning('Extra high');
		expect(screen.queryAllByRole('alert')).toEqual([]);
		expect((await persistence.settings.load()).value?.reasoning).toBe('xhigh');
		await inbox.dispose();
	});
});

describe('inbox answer instructions setting', () => {
	function input() {
		return screen.getByRole<HTMLTextAreaElement>('textbox', {
			name: 'Answer instructions',
		});
	}

	async function save() {
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: 'Save instructions' }),
			);
		});
	}

	it('saves replacement text, restores it on reopening, and resets the saved default', async () => {
		const { inbox, persistence } = await setup();
		const { unmount } = renderSettings(inbox);
		expect(input().value).toBe(DEFAULT_ANSWER_INSTRUCTIONS);
		const custom = 'Explain step by step.\nUse a small C example.';
		fireEvent.change(input(), { target: { value: custom } });
		await save();
		expect((await persistence.settings.load()).value?.answerInstructions).toBe(
			custom,
		);
		unmount();
		renderSettings(inbox);
		expect(input().value).toBe(custom);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
		});
		expect((await persistence.settings.load()).value?.answerInstructions).toBe(
			DEFAULT_ANSWER_INSTRUCTIONS,
		);
		expect(input().value).toBe(DEFAULT_ANSWER_INSTRUCTIONS);
		await inbox.dispose();
	});

	it('reports a failed save once, retains the replacement text and allows saving it again', async () => {
		const { inbox, persistence } = await setup();
		renderSettings(inbox);
		fireEvent.change(input(), { target: { value: 'Keep this wording.' } });
		vi.spyOn(persistence.settings, 'save').mockRejectedValueOnce(
			new Error('Disk full'),
		);
		await save();
		expect(
			screen.getAllByRole('alert').map((alert) => alert.textContent),
		).toEqual(['Disk full']);
		expect(input().value).toBe('Keep this wording.');
		await save();
		expect(screen.queryAllByRole('alert')).toEqual([]);
		expect((await persistence.settings.load()).value?.answerInstructions).toBe(
			'Keep this wording.',
		);
		await inbox.dispose();
	});
});

describe('inbox action settings', () => {
	async function fillDraft(name: string, prompt: string) {
		fireEvent.change(screen.getByRole('textbox', { name: 'Action name' }), {
			target: { value: name },
		});
		fireEvent.change(screen.getByRole('textbox', { name: 'Action prompt' }), {
			target: { value: prompt },
		});
		const save = screen.getByRole('button', { name: 'Save action' });
		await vi.waitFor(() => expect(save).toHaveProperty('disabled', false));
		return save;
	}

	async function savedActions(
		persistence: Awaited<ReturnType<typeof setup>>['persistence'],
	) {
		return (await persistence.settings.load()).value?.actions;
	}

	it('adds, renames and deletes a persisted action with an icon and color, retaining its ID', async () => {
		const { inbox, persistence } = await setup();
		renderSettings(inbox);
		fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
		expect(screen.getByRole('button', { name: 'Save action' })).toHaveProperty(
			'disabled',
			true,
		);
		const save = await fillDraft(
			'🃏',
			'Read [[Workflow Guide]] and append proposals.',
		);
		await act(async () => {
			fireEvent.click(save);
		});
		const id = inbox.settings.get().actions[0]?.id;
		expect(id).toBeTruthy();
		expect(await savedActions(persistence)).toEqual([
			{
				id,
				name: '🃏',
				prompt: 'Read [[Workflow Guide]] and append proposals.',
				icon: 'lucide-sparkles',
				color: 'blue',
			},
		]);
		fireEvent.click(screen.getByRole('button', { name: 'Edit 🃏' }));
		fireEvent.change(screen.getByRole('textbox', { name: 'Action name' }), {
			target: { value: 'Cards' },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
		});
		expect(inbox.settings.get().actions[0]?.id).toBe(id);
		expect((await savedActions(persistence))?.[0]?.name).toBe('Cards');
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Delete Cards' }));
		});
		expect(await savedActions(persistence)).toEqual([]);
		await inbox.dispose();
	});

	it('preserves a draft and its identity when saving fails', async () => {
		const { inbox, persistence } = await setup();
		renderSettings(inbox);
		fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
		const save = await fillDraft('🃏', 'Keep my draft');
		vi.spyOn(persistence.settings, 'save').mockRejectedValueOnce(
			new Error('Disk full'),
		);
		await act(async () => {
			fireEvent.click(save);
		});
		expect(
			screen.getAllByRole('alert').map((alert) => alert.textContent),
		).toEqual(['Disk full']);
		// A failed save keeps the draft editor open and reuses its reserved ID.
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
		});
		expect(inbox.settings.get().actions).toHaveLength(1);
		expect((await savedActions(persistence))?.[0]?.prompt).toBe(
			'Keep my draft',
		);
		await inbox.dispose();
	});
});
