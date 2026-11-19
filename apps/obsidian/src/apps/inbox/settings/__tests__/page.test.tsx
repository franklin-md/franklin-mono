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
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboxController } from '../../controller/index.js';
import type { AnswerRequest } from '../../controller/types.js';
import { inboxCodec } from '../../controller/schema.js';
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
	const persistence = createSingleFilePersister(
		new MemoryFilesystem(),
		toAbsolutePath('/inbox.json'),
		inboxCodec,
	);
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
	it('shows the saved selection, persists a change across restarts and reflects external preference changes', async () => {
		const { inbox, persistence, options } = await setup();
		const { unmount } = renderSettings(inbox);
		expect(trigger().getAttribute('title')).toBe('test · test · Medium');
		await chooseReasoning('High');
		expect((await persistence.load()).value?.preferences.reasoning).toBe(
			'high',
		);
		unmount();
		await inbox.dispose();
		const restored = await InboxController.create(options);
		renderSettings(restored);
		expect(trigger().getAttribute('title')).toBe('test · test · High');
		await act(async () => {
			await restored.configure({ reasoning: 'low' });
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

	it('reports a failed save once and retries it without another selection', async () => {
		const { inbox, persistence } = await setup();
		renderSettings(inbox);
		vi.spyOn(persistence, 'save').mockRejectedValueOnce(new Error('Disk full'));
		await chooseReasoning('Extra high');
		expect(
			screen.getAllByRole('alert').map((alert) => alert.textContent),
		).toEqual(['Inbox could not be saved: Disk full']);
		expect((await persistence.load()).value?.preferences.reasoning).toBe(
			'medium',
		);
		expect(trigger().getAttribute('title')).toBe('test · test · Extra high');
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
		});
		expect(screen.queryAllByRole('alert')).toEqual([]);
		expect((await persistence.load()).value?.preferences.reasoning).toBe(
			'xhigh',
		);
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
		expect(
			(await persistence.load()).value?.preferences.answerInstructions,
		).toBe(custom);
		unmount();
		renderSettings(inbox);
		expect(input().value).toBe(custom);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
		});
		expect(
			(await persistence.load()).value?.preferences.answerInstructions,
		).toBe(DEFAULT_ANSWER_INSTRUCTIONS);
		expect(input().value).toBe(DEFAULT_ANSWER_INSTRUCTIONS);
		await inbox.dispose();
	});

	it('reports a failed save once, retains the replacement text and allows saving it again', async () => {
		const { inbox, persistence } = await setup();
		renderSettings(inbox);
		fireEvent.change(input(), { target: { value: 'Keep this wording.' } });
		vi.spyOn(persistence, 'save').mockRejectedValueOnce(new Error('Disk full'));
		await save();
		expect(
			screen.getAllByRole('alert').map((alert) => alert.textContent),
		).toEqual(['Inbox could not be saved: Disk full']);
		expect(input().value).toBe('Keep this wording.');
		await save();
		expect(screen.queryAllByRole('alert')).toEqual([]);
		expect(
			(await persistence.load()).value?.preferences.answerInstructions,
		).toBe('Keep this wording.');
		await inbox.dispose();
	});
});
