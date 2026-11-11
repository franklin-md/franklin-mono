import type { TAbstractFile, TFile, TFolder } from 'obsidian';

export function isFile(f: TAbstractFile): f is TFile {
	return 'stat' in f && 'basename' in f;
}

export function isFolder(f: TAbstractFile): f is TFolder {
	return 'children' in f;
}
