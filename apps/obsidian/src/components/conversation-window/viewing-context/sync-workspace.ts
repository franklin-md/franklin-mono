// TODO: At some point, we should be pointing directly into the extension path for this (rather than exporting from root)
import type { Store, ViewingContextState } from '@franklin/agent';
import type { EventRef, Workspace } from 'obsidian';

import { collectViewedReferences } from './collect.js';
import { toViewedMarkdownFile } from './markdown-file.js';

type WorkspaceViewingContextSync = {
	sync: () => void;
	dispose: () => void;
};

type SyncWorkspaceViewingContextOptions = {
	workspace: Workspace;
	viewingContext: Store<ViewingContextState>;
	now?: () => number;
};

export function syncWorkspaceViewingContext({
	workspace,
	viewingContext,
	now = Date.now,
}: SyncWorkspaceViewingContextOptions): WorkspaceViewingContextSync {
    // Stores `lastViewed` information so it may be attached to references
	const openedAtByPath = new Map<string, number>();
	let disposed = false;

	const sync = () => {
		if (disposed) return;

        // TODO: Arguably the collect should be without opened
        // Then another method attaches opened information
        // Lastly, another method is in charge of ordering.
		const references = collectViewedReferences(workspace, openedAtByPath);
		viewingContext.set((draft) => {
			draft.references = references;
		});
	};

	const markOpenedAndSync = (file: unknown) => {
		const markdownFile = toViewedMarkdownFile(file);
		if (markdownFile) {
			openedAtByPath.set(markdownFile.path, now());
		}
		sync();
	};

	const eventRefs: EventRef[] = [
		workspace.on('file-open', markOpenedAndSync),
		workspace.on('active-leaf-change', () => {
			markOpenedAndSync(workspace.getActiveFile());
		}),
		workspace.on('layout-change', sync),
	];

	workspace.onLayoutReady(sync);

	return {
		sync,
		dispose() {
			if (disposed) return;
			disposed = true;
			for (const eventRef of eventRefs) {
				workspace.offref(eventRef);
			}
		},
	};
}
