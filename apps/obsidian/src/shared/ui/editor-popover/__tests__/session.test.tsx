// @vitest-environment jsdom

import { EditorView } from '@codemirror/view';
import { act } from '@testing-library/react';
import type { Editor } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPortalRoot } from '../../portal.js';
import { createEditorAnchor } from '../anchor.js';
import { mountEditorPopover } from '../mount.js';
import { createEditorPopoverTestHost } from '../testing/host.js';
import type { EditorPopoverSession } from '../types.js';

let host: ReturnType<typeof createEditorPopoverTestHost>;
let session: EditorPopoverSession | undefined;
const migrated = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	'onWindowMigrated',
);

beforeEach(() => {
	Object.defineProperty(HTMLElement.prototype, 'onWindowMigrated', {
		configurable: true,
		writable: true,
		value: () => () => {},
	});
	host = createEditorPopoverTestHost();
});

afterEach(async () => {
	await act(async () => session?.close(false));
	session = undefined;
	host.destroy();
	clearPortalRoot(document);
	document.body.replaceChildren();
	if (migrated)
		Object.defineProperty(HTMLElement.prototype, 'onWindowMigrated', migrated);
	else Reflect.deleteProperty(HTMLElement.prototype, 'onWindowMigrated');
	vi.restoreAllMocks();
});

function openPopover() {
	const validate = vi.fn();
	const onClose = vi.fn();
	act(() => {
		session = mountEditorPopover({
			...host,
			validate,
			onClose,
			render: (current) => (
				<div ref={current.contentRef}>
					<input aria-label="Request" />
				</div>
			),
		});
	});
	if (!session) throw new Error('Popover did not mount');
	return { session, validate, onClose };
}

describe('editor popover lifecycle', () => {
	it('anchors to the invocation caret through edits and later cursor moves', () => {
		host.cm.dispatch({ selection: { anchor: 3 } });
		const coords = vi
			.spyOn(host.cm, 'coordsAtPos')
			.mockImplementation((pos) => ({
				left: pos * 10,
				right: pos * 10 + 1,
				top: 20,
				bottom: 30,
			}));
		const anchor = createEditorAnchor(host.editor, () => {});
		try {
			expect(anchor.getBoundingClientRect().left).toBe(30);
			host.cm.dispatch({ changes: { from: 0, insert: 'added ' } });
			host.cm.dispatch({ selection: { anchor: 0 } });
			expect(anchor.getBoundingClientRect().left).toBe(90);
			host.cm.dispatch({ changes: { from: 9, insert: 'x' } });
			expect(anchor.getBoundingClientRect().left).toBe(100);
			coords.mockReturnValue(null);
			expect(anchor.getBoundingClientRect().left).toBe(100);
		} finally {
			anchor.dispose();
		}
	});

	it('rejects editors without the registered anchor extension', () => {
		const cm = new EditorView();
		try {
			expect(() =>
				createEditorAnchor({ cm } as unknown as Editor, () => {}),
			).toThrow('ready');
		} finally {
			cm.destroy();
		}
	});

	it('focuses its content and restores the editor once when explicitly closed', async () => {
		const { session, onClose } = openPopover();
		session.focus();
		expect(document.activeElement?.getAttribute('aria-label')).toBe('Request');
		await act(async () => {
			session.close(true);
			session.close(true);
		});
		expect(host.focus).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledOnce();
		expect(host.workspace.offref).toHaveBeenCalledTimes(3);
		expect(host.stopMigration).toHaveBeenCalledOnce();
		expect(document.querySelector('input')).toBeNull();
	});

	it('removes the host even when the close callback throws', async () => {
		const { session, onClose } = openPopover();
		const panelHost = document.querySelector('input')?.closest('.franklin');
		expect(panelHost?.isConnected).toBe(true);
		onClose.mockImplementation(() => {
			throw new Error('close failed');
		});
		await act(async () => {
			expect(() => session.close(false)).toThrow('close failed');
		});
		expect(panelHost?.isConnected).toBe(false);
		expect(host.stopMigration).toHaveBeenCalledOnce();
		expect(host.focus).not.toHaveBeenCalled();
	});

	it('releases earlier listeners if host registration fails partway through', async () => {
		const on = host.workspace.on.getMockImplementation();
		if (!on) throw new Error('Missing workspace fixture');
		host.workspace.on.mockImplementation((name, listener) => {
			if (name === 'active-leaf-change') throw new Error('Host unavailable');
			return on(name, listener);
		});
		expect(() => openPopover()).toThrow('Host unavailable');
		await act(async () => {});
		expect(host.workspace.offref).toHaveBeenCalledOnce();
	});

	it.each(['file', 'detached', 'invalid', 'migration', 'window'])(
		'closes without stealing focus when the host becomes unavailable: %s',
		async (reason) => {
			const { onClose, validate } = openPopover();
			await act(async () => {
				switch (reason) {
					case 'file':
						host.changeFile();
						host.emit('file-open');
						break;
					case 'detached':
						host.cm.dom.remove();
						host.emit('active-leaf-change');
						break;
					case 'invalid':
						validate.mockImplementation(() => {
							throw new Error('Capture invalidated');
						});
						host.emit('editor-change');
						break;
					case 'migration':
						host.migrate();
						break;
					case 'window':
						window.dispatchEvent(new Event('pagehide'));
						break;
				}
			});
			expect(onClose).toHaveBeenCalledOnce();
			expect(host.focus).not.toHaveBeenCalled();
			expect(document.querySelector('input')).toBeNull();
		},
	);
});
