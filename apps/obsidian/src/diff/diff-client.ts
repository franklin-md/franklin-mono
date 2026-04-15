import type { Vault } from 'obsidian';
import { normalizePath } from 'obsidian';

export type DiffEntry = {
	path: string;
	oldContent: string;
};

export interface DiffClient {
	getEntry(path: string): Promise<DiffEntry | null>;
	onEntryAppeared(cb: (path: string) => void): () => void;
	onEntryRemoved(cb: (path: string) => void): () => void;
}

/**
 * Mock client: when the user opens `new.md`, return `old.md`'s contents
 * as the prior version. Lets us test the full pipeline before wiring a
 * real bridge to the extension side.
 */
export class MockDiffClient implements DiffClient {
	constructor(private vault: Vault) {}

	async getEntry(path: string): Promise<DiffEntry | null> {
		if (!path.endsWith('new.md')) return null;
		const oldPath = normalizePath('old.md');
		const exists = await this.vault.adapter.exists(oldPath);
		if (!exists) return null;
		const oldContent = await this.vault.adapter.read(oldPath);
		return { path, oldContent };
	}

	onEntryAppeared(_cb: (path: string) => void): () => void {
		return () => {};
	}

	onEntryRemoved(_cb: (path: string) => void): () => void {
		return () => {};
	}
}
