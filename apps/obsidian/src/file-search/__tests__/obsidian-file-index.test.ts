import type {
	App,
	EventRef,
	TAbstractFile,
	TFile,
	TFolder,
	Vault,
} from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeFile } from '../../platform/filesystem/test-helpers.js';
import { ObsidianFileIndex } from '../obsidian-file-index.js';

type VaultEventName = 'create' | 'delete' | 'modify' | 'rename';

interface MockEventRef extends EventRef {
	readonly name: VaultEventName;
	readonly callback: (...args: unknown[]) => void;
}

function installActiveWindow(): void {
	(globalThis as typeof globalThis & { activeWindow: Window }).activeWindow =
		globalThis as unknown as Window;
}

function makeFolder(path: string): TFolder {
	const name = path.split('/').pop() ?? path;
	return {
		path,
		name,
		children: [],
		vault: {} as Vault,
		parent: null,
		isRoot: () => path === '',
	} as TFolder;
}

function makeFileWithMtime(path: string, mtime: number): TFile {
	const file = makeFile(path);
	file.stat.mtime = mtime;
	return file;
}

function pathsForQuery(app: App, query: string): string[] {
	const fileIndex = new ObsidianFileIndex(app);
	try {
		return fileIndex.search(query).map((item) => item.path);
	} finally {
		fileIndex.dispose();
	}
}

function createMockObsidianApp(
	initialFiles: readonly TFile[],
	options: { layoutReady?: boolean } = {},
) {
	let files = [...initialFiles];
	const eventRefs: MockEventRef[] = [];
	const layoutReadyCallbacks: Array<() => void> = [];
	const layoutReady = options.layoutReady ?? true;

	const vault = {
		getFiles: vi.fn(() => files),
		on: vi.fn(
			(name: VaultEventName, callback: (...args: unknown[]) => void) => {
				const eventRef: MockEventRef = { name, callback };
				eventRefs.push(eventRef);
				return eventRef;
			},
		),
		offref: vi.fn((eventRef: EventRef) => {
			const index = eventRefs.indexOf(eventRef as MockEventRef);
			if (index >= 0) {
				eventRefs.splice(index, 1);
			}
		}),
	} as unknown as Vault;

	const app = {
		vault,
		workspace: {
			onLayoutReady: vi.fn((callback: () => void) => {
				if (layoutReady) {
					callback();
					return;
				}
				layoutReadyCallbacks.push(callback);
			}),
		},
	} as unknown as App;

	function emitLayoutReady(): void {
		for (const callback of layoutReadyCallbacks.splice(0)) {
			callback();
		}
	}

	function setFiles(nextFiles: readonly TFile[]): void {
		files = [...nextFiles];
	}

	function emitCreate(file: TAbstractFile): void {
		for (const eventRef of eventRefs.filter((ref) => ref.name === 'create')) {
			eventRef.callback(file);
		}
	}

	function emitDelete(file: TAbstractFile): void {
		for (const eventRef of eventRefs.filter((ref) => ref.name === 'delete')) {
			eventRef.callback(file);
		}
	}

	function emitModify(file: TAbstractFile): void {
		for (const eventRef of eventRefs.filter((ref) => ref.name === 'modify')) {
			eventRef.callback(file);
		}
	}

	function emitRename(file: TAbstractFile, oldPath: string): void {
		for (const eventRef of eventRefs.filter((ref) => ref.name === 'rename')) {
			eventRef.callback(file, oldPath);
		}
	}

	return {
		app,
		emitCreate,
		emitDelete,
		emitLayoutReady,
		emitModify,
		emitRename,
		eventRefs,
		setFiles,
		vault,
	};
}

afterEach(() => {
	vi.useRealTimers();
});

describe('ObsidianFileIndex', () => {
	it('snapshots all vault files, not only Markdown files', () => {
		installActiveWindow();
		const { app } = createMockObsidianApp([
			makeFile('notes/today.md'),
			makeFile('assets/diagram.png'),
			makeFile('references/paper.pdf'),
		]);

		expect(pathsForQuery(app, 'today')).toEqual(['notes/today.md']);
		expect(pathsForQuery(app, 'diagram')).toEqual(['assets/diagram.png']);
		expect(pathsForQuery(app, 'paper')).toEqual(['references/paper.pdf']);
	});

	it('registers vault events after Obsidian layout is ready', () => {
		installActiveWindow();
		const { app, emitLayoutReady, vault } = createMockObsidianApp(
			[makeFile('notes/today.md')],
			{ layoutReady: false },
		);

		const fileIndex = new ObsidianFileIndex(app);

		expect(vault.on).not.toHaveBeenCalled();

		emitLayoutReady();

		expect(vault.on).toHaveBeenCalledTimes(4);
		fileIndex.dispose();
	});

	it('coalesces startup create event floods without notifying for unchanged paths', () => {
		installActiveWindow();
		vi.useFakeTimers();
		const notesFile = makeFile('notes/today.md');
		const { app, emitCreate } = createMockObsidianApp([notesFile]);
		const fileIndex = new ObsidianFileIndex(app);
		const listener = vi.fn();
		fileIndex.subscribe(listener);

		emitCreate(notesFile);
		emitCreate(notesFile);
		emitCreate(notesFile);
		vi.advanceTimersByTime(499);

		expect(listener).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);

		expect(listener).not.toHaveBeenCalled();
		expect(fileIndex.search('today').map((item) => item.path)).toEqual([
			'notes/today.md',
		]);
	});

	it('adds newly created files after the event burst settles', () => {
		installActiveWindow();
		vi.useFakeTimers();
		const notesFile = makeFile('notes/today.md');
		const diagramFile = makeFile('assets/diagram.png');
		const { app, emitCreate, setFiles } = createMockObsidianApp([notesFile]);
		const fileIndex = new ObsidianFileIndex(app);

		setFiles([notesFile, diagramFile]);
		emitCreate(diagramFile);

		expect(fileIndex.search('diagram')).toEqual([]);

		vi.advanceTimersByTime(500);

		expect(fileIndex.search('diagram').map((item) => item.path)).toEqual([
			'assets/diagram.png',
		]);
	});

	it('removes deleted files after the event burst settles', () => {
		installActiveWindow();
		vi.useFakeTimers();
		const notesFile = makeFile('notes/today.md');
		const diagramFile = makeFile('assets/diagram.png');
		const { app, emitDelete, setFiles } = createMockObsidianApp([
			notesFile,
			diagramFile,
		]);
		const fileIndex = new ObsidianFileIndex(app);

		setFiles([diagramFile]);
		emitDelete(notesFile);

		expect(fileIndex.search('today').map((item) => item.path)).toEqual([
			'notes/today.md',
		]);

		vi.advanceTimersByTime(500);

		expect(fileIndex.search('today')).toEqual([]);
		expect(fileIndex.search('diagram').map((item) => item.path)).toEqual([
			'assets/diagram.png',
		]);
	});

	it('replaces renamed file paths after the event burst settles', () => {
		installActiveWindow();
		vi.useFakeTimers();
		const oldFile = makeFile('notes/draft.md');
		const renamedFile = makeFile('notes/final.md');
		const { app, emitRename, setFiles } = createMockObsidianApp([oldFile]);
		const fileIndex = new ObsidianFileIndex(app);

		setFiles([renamedFile]);
		emitRename(renamedFile, 'notes/draft.md');

		expect(fileIndex.search('draft').map((item) => item.path)).toEqual([
			'notes/draft.md',
		]);

		vi.advanceTimersByTime(500);

		expect(fileIndex.search('draft')).toEqual([]);
		expect(fileIndex.search('final').map((item) => item.path)).toEqual([
			'notes/final.md',
		]);
	});

	it('uses modified file times to order equivalent fuzzy matches', () => {
		installActiveWindow();
		const { app } = createMockObsidianApp([
			makeFileWithMtime('old/draft.md', 10),
			makeFileWithMtime('new/draft.md', 20),
		]);

		expect(pathsForQuery(app, 'draft')).toEqual([
			'new/draft.md',
			'old/draft.md',
		]);
	});

	it('updates modified file times after the event burst settles', () => {
		installActiveWindow();
		vi.useFakeTimers();
		const oldDraft = makeFileWithMtime('old/draft.md', 10);
		const newDraft = makeFileWithMtime('new/draft.md', 20);
		const updatedOldDraft = makeFileWithMtime('old/draft.md', 30);
		const { app, emitModify, setFiles } = createMockObsidianApp([
			oldDraft,
			newDraft,
		]);
		const fileIndex = new ObsidianFileIndex(app);

		setFiles([updatedOldDraft, newDraft]);
		emitModify(updatedOldDraft);

		expect(fileIndex.search('draft').map((item) => item.path)).toEqual([
			'new/draft.md',
			'old/draft.md',
		]);

		vi.advanceTimersByTime(500);

		expect(fileIndex.search('draft').map((item) => item.path)).toEqual([
			'old/draft.md',
			'new/draft.md',
		]);
	});

	it('reconciles folder events from the next full vault snapshot', () => {
		installActiveWindow();
		vi.useFakeTimers();
		const notesFile = makeFile('notes/today.md');
		const diagramFile = makeFile('assets/diagram.png');
		const { app, emitDelete, setFiles } = createMockObsidianApp([
			notesFile,
			diagramFile,
		]);
		const fileIndex = new ObsidianFileIndex(app);

		setFiles([diagramFile]);
		emitDelete(makeFolder('notes'));
		vi.advanceTimersByTime(500);

		expect(fileIndex.search('today')).toEqual([]);
		expect(fileIndex.search('diagram').map((item) => item.path)).toEqual([
			'assets/diagram.png',
		]);
	});

	it('only reconciles once after repeated vault events', () => {
		installActiveWindow();
		vi.useFakeTimers();
		const notesFile = makeFile('notes/today.md');
		const diagramFile = makeFile('assets/diagram.png');
		const { app, emitCreate, setFiles, vault } = createMockObsidianApp([
			notesFile,
		]);
		const fileIndex = new ObsidianFileIndex(app);

		setFiles([notesFile, diagramFile]);
		emitCreate(diagramFile);
		vi.advanceTimersByTime(250);
		emitCreate(diagramFile);
		vi.advanceTimersByTime(499);

		expect(fileIndex.search('diagram')).toEqual([]);

		vi.advanceTimersByTime(1);

		expect(vault.getFiles).toHaveBeenCalledTimes(2);
		expect(fileIndex.search('diagram').map((item) => item.path)).toEqual([
			'assets/diagram.png',
		]);
	});

	it('cancels pending reconciliation and unsubscribes vault events when disposed', () => {
		installActiveWindow();
		vi.useFakeTimers();
		const notesFile = makeFile('notes/today.md');
		const diagramFile = makeFile('assets/diagram.png');
		const { app, emitCreate, setFiles, vault } = createMockObsidianApp([
			notesFile,
		]);
		const fileIndex = new ObsidianFileIndex(app);

		setFiles([notesFile, diagramFile]);
		emitCreate(diagramFile);
		fileIndex.dispose();
		vi.advanceTimersByTime(500);

		expect(vault.offref).toHaveBeenCalledTimes(4);
		expect(fileIndex.search('diagram')).toEqual([]);
	});
});
