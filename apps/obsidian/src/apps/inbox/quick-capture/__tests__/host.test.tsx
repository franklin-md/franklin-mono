// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import { InboxCaptureChooser } from '../host.js';
import { createInboxDirectiveScenario } from '../../directive/testing/scenario.js';
import { createDirectiveTestEditor } from '../../../../shared/directives/testing/editor.js';
import { clearPortalRoot } from '../../../../shared/ui/portal.js';
import type { CaptureAction } from '../types.js';

let scenario: Awaited<ReturnType<typeof createInboxDirectiveScenario>>;
let target: ReturnType<typeof createDirectiveTestEditor>;
let chooser: InboxCaptureChooser;
let focus = vi.fn<() => void>();
let onSuccess = vi.fn<(action: CaptureAction) => void>();
let on = vi.fn<(event: string, listener: () => void) => void>();
const migrated = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	'onWindowMigrated',
);

beforeEach(async () => {
	Object.defineProperty(HTMLElement.prototype, 'onWindowMigrated', {
		configurable: true,
		value: () => () => {},
	});
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
	scenario = await createInboxDirectiveScenario();
	target = createDirectiveTestEditor(
		'Original thoughts and questions?\nDifferent text',
	);
	document.body.append(target.cm.dom);
	vi.spyOn(target.cm, 'coordsAtPos').mockReturnValue({
		left: 40,
		right: 41,
		top: 40,
		bottom: 60,
	});
	focus = vi.fn(() => target.cm.focus());
	Object.assign(target.editor, { focus });
	onSuccess = vi.fn();
	on = vi.fn();
	chooser = new InboxCaptureChooser({
		app: { workspace: { on, offref: vi.fn() } } as unknown as App,
		inbox: scenario.inbox,
		definition: scenario.service.definition,
		onError: scenario.error,
		onSuccess,
	});
});
afterEach(async () => {
	await act(() => chooser.dispose());
	cleanup();
	await scenario.service.dispose();
	await scenario.inbox.dispose();
	await scenario.registry.dispose();
	target.destroy();
	clearPortalRoot(document);
	document.body.replaceChildren();
	if (migrated)
		Object.defineProperty(HTMLElement.prototype, 'onWindowMigrated', migrated);
	else Reflect.deleteProperty(HTMLElement.prototype, 'onWindowMigrated');
	vi.unstubAllGlobals();
});

it('queues Thought dump from the opening source immediately, without changing composer mode or inserting a question pill', async () => {
	const add = vi
		.spyOn(scenario.inbox.thoughtDumps, 'add')
		.mockResolvedValue(undefined);
	await act(async () => {
		chooser.open(target.editor, target.info);
	});
	target.cm.dispatch({ selection: { anchor: target.cm.state.doc.length } });
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: /Thought dump/ }));
	});
	expect(add).toHaveBeenCalledExactlyOnceWith(
		'Original thoughts and questions?',
		expect.objectContaining({
			quote: 'Original thoughts and questions?',
			location: expect.objectContaining({ path: 'original.md' }),
		}),
	);
	expect(scenario.inbox.state.get().preferences.mode).toBeUndefined();
	expect(target.editor.getValue()).not.toContain(':::franklin:');
	expect(onSuccess).toHaveBeenCalledExactlyOnceWith('thought-dump');
	expect(screen.queryByRole('dialog')).toBeNull();
	expect(focus).toHaveBeenCalledOnce();
});

it('refocuses one chooser and keeps its original capture on repeated invocation', async () => {
	await act(async () => {
		chooser.open(target.editor, target.info);
	});
	target.cm.dispatch({ selection: { anchor: target.cm.state.doc.length } });
	await act(async () => {
		chooser.open(target.editor, target.info);
	});
	expect(screen.getAllByRole('dialog')).toHaveLength(1);
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: /Quick add/ }));
	});
	expect(scenario.inbox.state.get().questions).toHaveLength(1);
	expect(scenario.inbox.state.get().questions[0]?.text).toBe(
		'Original thoughts and questions?',
	);
	expect(target.editor.getValue()).toMatch(
		/Original thoughts and questions\? :::franklin:inbox-question:/,
	);
});

it('cancels on Escape without queueing anything and returns focus to the editor', async () => {
	await act(async () => {
		chooser.open(target.editor, target.info);
	});
	await act(async () => {
		fireEvent.keyDown(screen.getByRole('button', { name: /Quick add/ }), {
			key: 'Escape',
		});
	});
	expect(scenario.inbox.state.get().questions).toHaveLength(0);
	expect(chooser.isOpen).toBe(false);
	expect(focus).toHaveBeenCalledOnce();
	expect(screen.queryByRole('dialog')).toBeNull();
});

it('lets an accepted Quick add finish after dismissal and drains it before disposal', async () => {
	let finish!: () => void;
	vi.spyOn(scenario.persistence, 'save').mockImplementationOnce(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	await act(async () => {
		chooser.open(target.editor, target.info);
	});
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: /Quick add/ }));
	});
	await act(async () => {
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
	});
	let disposed = false;
	const disposing = chooser.dispose().then(() => {
		disposed = true;
	});
	expect(disposed).toBe(false);
	await act(async () => {
		finish();
		await disposing;
	});
	expect(scenario.inbox.state.get().questions).toHaveLength(1);
	expect(target.editor.getValue()).toContain(':::franklin:inbox-question:');
	expect(scenario.error).not.toHaveBeenCalled();
});

it('closes if the originating editor switches files', async () => {
	await act(async () => {
		chooser.open(target.editor, target.info);
	});
	await act(async () => {
		Object.defineProperty(target.info, 'file', { value: null });
		on.mock.calls.find(([event]) => event === 'file-open')?.[1]();
	});
	expect(chooser.isOpen).toBe(false);
	expect(screen.queryByRole('dialog')).toBeNull();
	expect(scenario.inbox.state.get().questions).toHaveLength(0);
});
