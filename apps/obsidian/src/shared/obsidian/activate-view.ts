import type { Workspace } from 'obsidian';

export async function activateView(
	workspace: Workspace,
	viewType: string,
): Promise<void> {
	const first = workspace.getLeavesOfType(viewType)[0];
	if (first) {
		await workspace.revealLeaf(first);
		return;
	}

	const leaf = workspace.getRightLeaf(false);
	if (leaf) {
		await leaf.setViewState({ type: viewType, active: true });
		await workspace.revealLeaf(leaf);
	}
}
