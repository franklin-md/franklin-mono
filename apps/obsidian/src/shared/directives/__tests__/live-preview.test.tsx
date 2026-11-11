// @vitest-environment jsdom
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	deleteCharBackward,
	deleteCharForward,
	history,
	undo,
	redo,
} from '@codemirror/commands';
import { act } from '@testing-library/react';
import { editorLivePreviewField } from 'obsidian';
import type { App } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveRegistry } from '../registry.js';
import { createDirectiveTestPersistence } from '../testing/persistence.js';
import { createDirectiveExtension } from '../live-preview/extension.js';
import { clearPortalRoot } from '../../ui/portal.js';

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

afterEach(() => {
	clearPortalRoot(document);
	document.body.replaceChildren();
});

describe('Live Preview directives', () => {
	it('keeps Source mode as ordinary editable text', async () => {
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const instance = await registry
			.registerDirective('counter', () => <span>widget</span>)
			.create({});
		await act(async () => {
			const view = new EditorView({
				state: EditorState.create({
					doc: instance.text,
					selection: { anchor: instance.text.length },
					extensions: [
						editorLivePreviewField.init(() => false),
						createDirectiveExtension(registry),
					],
				}),
			});
			try {
				expect(view.dom.textContent).toContain(instance.text);
				deleteCharBackward(view);
				expect(view.state.doc.toString()).toBe(instance.text.slice(0, -1));
			} finally {
				view.destroy();
			}
		});
	});

	it('deletes an entire inline instance from either boundary and restores it through undo', async () => {
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const instance = await registry
			.registerDirective<{
				count: number;
			}>('counter', ({ state }) => <span>{state.count}</span>)
			.create({ count: 1 });
		const parent = document.createElement('div');
		document.body.append(parent);
		Object.defineProperty(Range.prototype, 'getClientRects', {
			configurable: true,
			value: () => [],
		});
		const migrated = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'onWindowMigrated',
		);
		Object.defineProperty(HTMLElement.prototype, 'onWindowMigrated', {
			configurable: true,
			value: () => () => {},
		});
		let view!: EditorView;
		try {
			await act(async () => {
				view = new EditorView({
					parent,
					state: EditorState.create({
						doc: `a${instance.text}b`,
						selection: { anchor: 1 + instance.text.length },
						extensions: [
							editorLivePreviewField,
							history(),
							createDirectiveExtension(registry),
						],
					}),
				});
			});
			await act(async () => {
				expect(deleteCharBackward(view)).toBe(true);
			});
			expect(view.state.doc.toString()).toBe('ab');
			await act(async () => {
				expect(undo(view)).toBe(true);
			});
			expect(view.state.doc.toString()).toBe(`a${instance.text}b`);
			await act(async () => {
				expect(redo(view)).toBe(true);
			});
			expect(view.state.doc.toString()).toBe('ab');
			await act(async () => {
				undo(view);
				view.dispatch({ selection: { anchor: 1 } });
				deleteCharForward(view);
			});
			expect(view.state.doc.toString()).toBe('ab');
		} finally {
			await act(async () => {
				view.destroy();
			});
			if (migrated)
				Object.defineProperty(
					HTMLElement.prototype,
					'onWindowMigrated',
					migrated,
				);
			else Reflect.deleteProperty(HTMLElement.prototype, 'onWindowMigrated');
			vi.restoreAllMocks();
			Reflect.deleteProperty(Range.prototype, 'getClientRects');
		}
	});
});
