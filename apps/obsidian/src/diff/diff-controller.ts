import { EditorView } from '@codemirror/view';
import type { Plugin } from 'obsidian';
import { MarkdownView } from 'obsidian';

import type { DiffClient } from './diff-client.js';
import {
	clearDiff,
	diffField,
	diffInvertedEffects,
	setDiffEntry,
} from './cm/diff-field.js';
import { diffDecorations, diffHoverTracking } from './cm/decorations.js';
import { acceptAllHunks, rejectAllHunks } from './cm/react-widgets.js';

type HeaderUI = {
	container: HTMLElement;
	count: HTMLElement;
};

type EditorSession = {
	currentPath: string | null;
	appliedPath: string | null;
	appliedOldContent: string | null;
	requestToken: number;
	markdownView: MarkdownView | null;
	header: HeaderUI | null;
};

export class DiffController {
	private sessions = new Map<EditorView, EditorSession>();

	constructor(
		private readonly plugin: Plugin,
		private readonly client: DiffClient,
	) {}

	onload() {
		this.plugin.registerEditorExtension([
			diffField,
			diffInvertedEffects,
			diffDecorations,
			diffHoverTracking,
			EditorView.updateListener.of((update) => {
				const prev = update.startState.field(diffField, false);
				const next = update.state.field(diffField, false);
				if (prev !== next) {
					this.syncHeaderActions(update.view);
				}
			}),
		]);

		const syncEditors = () => {
			this.syncAllEditors();
		};

		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-open', syncEditors),
		);
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('active-leaf-change', syncEditors),
		);
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('layout-change', syncEditors),
		);

		this.plugin.register(
			this.client.onEntryAppeared(() => this.syncAllEditors()),
		);
		this.plugin.register(
			this.client.onEntryRemoved(() => this.syncAllEditors()),
		);

		this.plugin.app.workspace.onLayoutReady(() => {
			this.syncAllEditors();
		});
	}

	onunload() {
		for (const [view, session] of this.sessions) {
			session.requestToken++;
			this.clearSession(view, session);
		}
		this.sessions.clear();
	}

	private syncAllEditors() {
		const seen = new Set<EditorView>();

		this.plugin.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			if (leaf.view.getMode() !== 'source') return;

			const view = this.getCmView(leaf.view);
			if (!view) return;

			seen.add(view);
			void this.syncEditor(view, leaf.view, leaf.view.file?.path ?? null);
		});

		for (const [view, session] of this.sessions) {
			if (seen.has(view)) continue;
			session.requestToken++;
			this.clearSession(view, session);
			this.sessions.delete(view);
		}
	}

	private async syncEditor(
		view: EditorView,
		markdownView: MarkdownView,
		filePath: string | null,
	) {
		const session = this.getSession(view);
		session.markdownView = markdownView;
		const normalizedPath = filePath ?? null;
		const pathChanged = session.currentPath !== normalizedPath;

		session.currentPath = normalizedPath;

		if (normalizedPath === null) {
			session.requestToken++;
			this.clearSession(view, session);
			return;
		}

		if (pathChanged) {
			this.clearSession(view, session);
		}

		const token = ++session.requestToken;
		const entry = await this.client.getEntry(normalizedPath);

		const current = this.sessions.get(view);
		if (!current) return;
		if (current.requestToken !== token) return;
		if (current.currentPath !== normalizedPath) return;
		if (!view.dom.isConnected) return;

		if (!entry) {
			this.clearSession(view, current);
			return;
		}

		const unchanged =
			current.appliedPath === normalizedPath &&
			current.appliedOldContent === entry.oldContent;
		if (unchanged) return;

		current.appliedPath = normalizedPath;
		current.appliedOldContent = entry.oldContent;
		view.dispatch({
			effects: setDiffEntry.of({ oldContent: entry.oldContent }),
		});
	}

	private clearSession(view: EditorView, session: EditorSession) {
		const hadDiff = view.state.field(diffField, false)?.oldContent != null;
		session.appliedPath = null;
		session.appliedOldContent = null;
		this.removeHeaderUI(session);

		if (hadDiff && view.dom.isConnected) {
			view.dispatch({ effects: clearDiff.of(null) });
		}
	}

	private getSession(view: EditorView): EditorSession {
		const existing = this.sessions.get(view);
		if (existing) return existing;

		const created: EditorSession = {
			currentPath: null,
			appliedPath: null,
			appliedOldContent: null,
			requestToken: 0,
			markdownView: null,
			header: null,
		};
		this.sessions.set(view, created);
		return created;
	}

	private getCmView(markdownView: MarkdownView): EditorView | null {
		const cm = (markdownView.editor as { cm?: EditorView }).cm;
		return cm ?? null;
	}

	private syncHeaderActions(view: EditorView) {
		const session = this.sessions.get(view);
		if (!session) return;

		const ds = view.state.field(diffField, false);
		if (!ds || ds.oldContent === null) {
			this.removeHeaderUI(session);
			return;
		}

		let pending = 0;
		for (const hunk of ds.hunks) {
			if (ds.status.get(hunk.id) === 'pending') pending++;
		}

		if (pending === 0) {
			this.removeHeaderUI(session);
			return;
		}

		this.ensureHeaderUI(view, session, pending);
	}

	private ensureHeaderUI(
		view: EditorView,
		session: EditorSession,
		pending: number,
	) {
		const markdownView = session.markdownView;
		if (!markdownView) return;

		const actionsEl = markdownView.containerEl.querySelector('.view-actions');
		if (!actionsEl) return;

		let header = session.header;
		if (!header || !header.container.isConnected) {
			const container = document.createElement('div');
			container.className = 'diff-plugin-header-group';

			const count = document.createElement('span');
			count.className = 'diff-plugin-header-count';
			container.appendChild(count);

			const accept = document.createElement('button');
			accept.type = 'button';
			accept.className = 'diff-plugin-header-btn diff-plugin-header-accept';
			accept.textContent = 'Accept All';
			accept.onclick = (event) => {
				event.preventDefault();
				event.stopPropagation();
				acceptAllHunks(view);
			};
			container.appendChild(accept);

			const reject = document.createElement('button');
			reject.type = 'button';
			reject.className = 'diff-plugin-header-btn diff-plugin-header-reject';
			reject.textContent = 'Reject All';
			reject.onclick = (event) => {
				event.preventDefault();
				event.stopPropagation();
				rejectAllHunks(view);
			};
			container.appendChild(reject);

			actionsEl.insertBefore(container, actionsEl.firstChild);

			header = { container, count };
			session.header = header;
		}

		header.count.textContent = `${pending} change${pending === 1 ? '' : 's'}`;
	}

	private removeHeaderUI(session: EditorSession) {
		if (!session.header) return;
		session.header.container.remove();
		session.header = null;
	}
}
