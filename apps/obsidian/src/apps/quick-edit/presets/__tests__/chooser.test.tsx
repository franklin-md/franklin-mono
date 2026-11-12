// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import type { App } from 'obsidian';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createQuickEditScenario } from '../../interaction/testing/scenario.js';
import { clearPortalRoot } from '../../../../shared/ui/portal.js';
import { QuickEditPresetChooser } from '../chooser.js';
import { createDefaultPresets } from '../defaults.js';

vi.mock('obsidian', async (original) => {
	const { StateField } = await import('@codemirror/state');
	return {
		...(await original<Record<string, unknown>>()),
		editorLivePreviewField: StateField.define({
			create: () => true,
			update: (value: boolean) => value,
		}),
	};
});
let h: Awaited<ReturnType<typeof createQuickEditScenario>>;
let chooser: QuickEditPresetChooser;
let presets = createDefaultPresets();
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
	h = await createQuickEditScenario('selected passage\nother row');
	Object.assign(h.editor, { focus: () => h.cm.focus() });
	on = vi.fn();
	presets = createDefaultPresets();
	chooser = new QuickEditPresetChooser({
		app: { workspace: { on, offref: vi.fn() } } as unknown as App,
		interaction: h.interaction,
		getPresets: () => presets,
		report: h.report,
	});
});
afterEach(async () => {
	await act(() => chooser.dispose());
	cleanup();
	await h.dispose();
	clearPortalRoot(document);
	document.body.replaceChildren();
	vi.unstubAllGlobals();
	if (migrated)
		Object.defineProperty(HTMLElement.prototype, 'onWindowMigrated', migrated);
	else Reflect.deleteProperty(HTMLElement.prototype, 'onWindowMigrated');
});
it('keeps the opening selection and resolved prompt, runs once and returns focus', async () => {
	h.cm.dispatch({ selection: { anchor: 0, head: 16 } });
	await act(async () => chooser.open(h.editor, h.info));
	expect(h.run).not.toHaveBeenCalled();
	const first = presets[0];
	if (!first) throw new Error('Expected a default preset');
	first.prompt = 'Changed after opening';
	h.cm.dispatch({ selection: { anchor: h.cm.state.doc.length } });
	await act(async () => chooser.open(h.editor, h.info));
	expect(screen.getAllByRole('dialog')).toHaveLength(1);
	const expand = screen.getByRole('button', { name: 'Expand' });
	await act(async () => {
		fireEvent.click(expand);
		fireEvent.click(expand);
	});
	await vi.waitFor(() => expect(h.run).toHaveBeenCalledOnce());
	expect(h.run.mock.calls[0]?.[0].state).toMatchObject({
		selection: 'selected passage',
		prompt: createDefaultPresets()[0]?.prompt,
	});
	await vi.waitFor(() => expect(h.disk).toBe('selected passage\nother row'));
	expect(screen.queryByRole('dialog')).toBeNull();
});
it('cancels without running and invalidates captures when the note changes', async () => {
	await act(async () => chooser.open(h.editor, h.info));
	await act(async () =>
		fireEvent.keyDown(screen.getByRole('button', { name: 'Expand' }), {
			key: 'Escape',
		}),
	);
	expect(h.run).not.toHaveBeenCalled();
	await act(async () => chooser.open(h.editor, h.info));
	await act(async () => {
		h.cm.dispatch({ changes: { from: 0, insert: 'changed ' } });
		on.mock.calls
			.filter(([event]) => event === 'editor-change')
			.at(-1)?.[1]();
	});
	expect(screen.queryByRole('dialog')).toBeNull();
	expect(h.run).not.toHaveBeenCalled();
});
