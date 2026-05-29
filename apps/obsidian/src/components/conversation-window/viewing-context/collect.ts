import type { ViewedReference } from '@franklin/agent';
import type { Workspace, WorkspaceLeaf } from 'obsidian';

import {
	toViewedMarkdownFile,
	type ViewedMarkdownFile,
} from './markdown-file.js';

export function collectViewedReferences(
	workspace: Workspace,
	openedAtByPath: ReadonlyMap<string, number>,
): ViewedReference[] {

    // Go through all open resources
	const filesByPath = new Map<string, ViewedMarkdownFile>();
	const activePath = toViewedMarkdownFile(workspace.getActiveFile())?.path;

	workspace.iterateAllLeaves((leaf) => {
		const file = getMarkdownFileFromLeaf(leaf);
		if (!file) return;

		filesByPath.set(file.path, file);
	});

    // Turn to a ViewedReference
	return Array.from(filesByPath.values())
		.map((file): ViewedReference => {
			const openedAt = openedAtByPath.get(file.path);
			const reference: ViewedReference = {
				type: 'file',
				locator: file.path,
				modifiedAt: file.stat.mtime,
			};
			if (openedAt !== undefined) {
				reference.openedAt = openedAt;
			}
			return reference;
		})
		.sort((left, right) => compareViewedReferences(left, right, activePath));
}

// Sort by open -> modified -> path/locator
function compareViewedReferences(
	left: ViewedReference,
	right: ViewedReference,
	activePath: string | undefined,
): number {
	const leftIsActive = left.locator === activePath;
	const rightIsActive = right.locator === activePath;
	if (leftIsActive !== rightIsActive) return leftIsActive ? -1 : 1;

	const openedDelta = (right.openedAt ?? 0) - (left.openedAt ?? 0);
	if (openedDelta !== 0) return openedDelta;

	const modifiedDelta = (right.modifiedAt ?? 0) - (left.modifiedAt ?? 0);
	if (modifiedDelta !== 0) return modifiedDelta;

	return left.locator.localeCompare(right.locator);
}

function getMarkdownFileFromLeaf(
	leaf: WorkspaceLeaf,
): ViewedMarkdownFile | null {
	const view = leaf.view as { file?: unknown };
	return toViewedMarkdownFile(view.file);
}
