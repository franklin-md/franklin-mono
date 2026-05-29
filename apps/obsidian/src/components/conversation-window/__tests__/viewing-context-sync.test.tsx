// @vitest-environment jsdom

import type {
	AppSettings,
	FranklinApp,
	FranklinRuntime,
	SettingsStore,
	Store,
	ViewingContextState,
} from '@franklin/agent';
import { createStore, viewingContextExtension } from '@franklin/agent';
import { AgentProvider, HarnessProvider } from '@franklin/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { App, EventRef, TFile, Workspace, WorkspaceLeaf } from 'obsidian';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeFile } from '../../../platform/filesystem/test-helpers.js';
import { ObsidianAppProvider } from '../../obsidian-app-context.js';
import { collectViewedReferences } from '../viewing-context/collect.js';
import { ViewingContextHeader } from '../viewing-context/header.js';
import { ViewingContextSync } from '../viewing-context/sync.js';
import { syncWorkspaceViewingContext } from '../viewing-context/sync-workspace.js';

// TODO(FRA-193): Move the workspace/leaf/event fixtures into the shared
// Obsidian test mock package once it grows Workspace support, and extract a
// small agent render harness if more component tests need this provider stack.
// These tests should not own a bespoke Obsidian event model or Franklin runtime
// scaffolding.
type WorkspaceEventName = 'file-open' | 'active-leaf-change' | 'layout-change';

type MockEventRef = EventRef & {
	readonly name: WorkspaceEventName;
	readonly callback: (...args: unknown[]) => void;
};

function createMarkdownLeaf(file: TFile): WorkspaceLeaf {
	return {
		view: {
			file,
		},
	} as unknown as WorkspaceLeaf;
}

function createFile(path: string, modifiedAt: number): TFile {
	const file = makeFile(path);
	file.stat.mtime = modifiedAt;
	return file;
}

function createWorkspace(initialLeaves: readonly WorkspaceLeaf[]) {
	let activeFile: TFile | null = null;
	let leaves = [...initialLeaves];
	const eventRefs: MockEventRef[] = [];
	const layoutReadyCallbacks: Array<() => void> = [];
	const offref = vi.fn((eventRef: EventRef) => {
		const index = eventRefs.indexOf(eventRef as MockEventRef);
		if (index >= 0) {
			eventRefs.splice(index, 1);
		}
	});

	const workspace = {
		getActiveFile: vi.fn(() => activeFile),
		iterateAllLeaves: vi.fn((callback: (leaf: WorkspaceLeaf) => void) => {
			for (const leaf of leaves) {
				callback(leaf);
			}
		}),
		offref,
		on: vi.fn(
			(name: WorkspaceEventName, callback: (...args: unknown[]) => void) => {
				const eventRef: MockEventRef = { name, callback };
				eventRefs.push(eventRef);
				return eventRef;
			},
		),
		onLayoutReady: vi.fn((callback: () => void) => {
			layoutReadyCallbacks.push(callback);
		}),
	} as unknown as Workspace;

	function emit(name: WorkspaceEventName, ...args: unknown[]): void {
		for (const eventRef of eventRefs.filter((ref) => ref.name === name)) {
			eventRef.callback(...args);
		}
	}

	function emitLayoutReady(): void {
		for (const callback of layoutReadyCallbacks.splice(0)) {
			callback();
		}
	}

	function setActiveFile(file: TFile | null): void {
		activeFile = file;
	}

	function setLeaves(nextLeaves: readonly WorkspaceLeaf[]): void {
		leaves = [...nextLeaves];
	}

	return {
		emit,
		emitLayoutReady,
		eventRefs,
		offref,
		setActiveFile,
		setLeaves,
		workspace,
	};
}

function createSettingsStore(
	shareViewedReferencesByDefault = true,
): SettingsStore {
	return createStore<AppSettings>({
		shareViewedReferencesByDefault,
		defaultLLMConfig: {
			provider: 'openai-codex',
			model: 'gpt-5.4',
			reasoning: 'medium',
		},
	}) as SettingsStore;
}

function createViewingContextStore(
	initial: ViewingContextState = {
		enabled: true,
		references: [],
	},
): Store<ViewingContextState> {
	return createStore(initial);
}

function createAgent(
	viewingContext: Store<ViewingContextState>,
): FranklinRuntime {
	return {
		getStore: vi.fn((key: string) => {
			if (key !== viewingContextExtension.keys.viewingContext) {
				throw new Error(`unexpected store: ${key}`);
			}
			return viewingContext;
		}),
	} as unknown as FranklinRuntime;
}

function renderViewingContextSync({
	agent,
	settings = createSettingsStore(),
	viewingContext = createViewingContextStore(),
	workspace,
}: {
	agent?: FranklinRuntime;
	settings?: SettingsStore;
	viewingContext?: Store<ViewingContextState>;
	workspace: Workspace;
}) {
	const resolvedAgent = agent ?? createAgent(viewingContext);
	const app = {
		workspace,
	} as unknown as App;
	const harness = {
		settings,
	} as unknown as FranklinApp;

	const result = render(
		<HarnessProvider harness={harness}>
			<ObsidianAppProvider value={app}>
				<AgentProvider agent={resolvedAgent}>
					<ViewingContextSync />
				</AgentProvider>
			</ObsidianAppProvider>
		</HarnessProvider>,
	);

	return {
		...result,
		agent: resolvedAgent,
		settings,
		viewingContext,
	};
}

function renderViewingContextHeader({
	component = <ViewingContextHeader />,
	viewingContext = createViewingContextStore(),
}: {
	component?: ReactNode;
	viewingContext?: Store<ViewingContextState>;
} = {}) {
	const agent = createAgent(viewingContext);

	const result = render(
		<AgentProvider agent={agent}>{component}</AgentProvider>,
	);

	return {
		...result,
		agent,
		viewingContext,
	};
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('collectViewedReferences', () => {
	it('collects only open Markdown leaves and orders the active file first', () => {
		const active = createFile('notes/active.md', 10);
		const edited = createFile('notes/edited.md', 30);
		const ignored = createFile('assets/image.png', 50);
		const workspace = createWorkspace([
			createMarkdownLeaf(edited),
			createMarkdownLeaf(ignored),
			createMarkdownLeaf(active),
		]);
		workspace.setActiveFile(active);

		expect(collectViewedReferences(workspace.workspace, new Map())).toEqual([
			expect.objectContaining({
				type: 'file',
				locator: 'notes/active.md',
				modifiedAt: 10,
			}),
			expect.objectContaining({
				type: 'file',
				locator: 'notes/edited.md',
				modifiedAt: 30,
			}),
		]);
	});

	it('dedupes open leaves by path', () => {
		const oldFile = createFile('notes/current.md', 10);
		const latestFile = createFile('notes/current.md', 40);
		const workspace = createWorkspace([
			createMarkdownLeaf(oldFile),
			createMarkdownLeaf(latestFile),
		]);

		expect(collectViewedReferences(workspace.workspace, new Map())).toEqual([
			expect.objectContaining({
				locator: 'notes/current.md',
				modifiedAt: 40,
			}),
		]);
	});

	it('orders by opened time, then modified time, then path', () => {
		const alpha = createFile('notes/alpha.md', 10);
		const beta = createFile('notes/beta.md', 30);
		const openedFirst = createFile('notes/opened-first.md', 1);
		const openedSecond = createFile('notes/opened-second.md', 2);
		const workspace = createWorkspace([
			createMarkdownLeaf(alpha),
			createMarkdownLeaf(openedFirst),
			createMarkdownLeaf(beta),
			createMarkdownLeaf(openedSecond),
		]);

		const references = collectViewedReferences(
			workspace.workspace,
			new Map([
				['notes/opened-first.md', 100],
				['notes/opened-second.md', 200],
			]),
		);

		expect(references.map((reference) => reference.locator)).toEqual([
			'notes/opened-second.md',
			'notes/opened-first.md',
			'notes/beta.md',
			'notes/alpha.md',
		]);
	});
});

describe('syncWorkspaceViewingContext', () => {
	it('registers workspace listeners and syncs immediately', () => {
		const file = createFile('notes/current.md', 10);
		const workspace = createWorkspace([createMarkdownLeaf(file)]);
		const viewingContext = createViewingContextStore();

		syncWorkspaceViewingContext({
			workspace: workspace.workspace,
			viewingContext,
		});

		expect(workspace.eventRefs).toHaveLength(3);
		expect(viewingContext.get().references).toEqual([
			expect.objectContaining({
				type: 'file',
				locator: 'notes/current.md',
				modifiedAt: 10,
			}),
		]);
	});

	it('tracks opened time from file-open events', () => {
		const first = createFile('notes/first.md', 30);
		const second = createFile('notes/second.md', 10);
		const workspace = createWorkspace([
			createMarkdownLeaf(first),
			createMarkdownLeaf(second),
		]);
		const viewingContext = createViewingContextStore();
		let clock = 0;
		const now = vi.fn(() => {
			clock += 100;
			return clock;
		});

		syncWorkspaceViewingContext({
			workspace: workspace.workspace,
			viewingContext,
			now,
		});

		workspace.emit('file-open', first);
		workspace.emit('file-open', second);

		expect(now).toHaveBeenCalledTimes(2);
		expect(
			viewingContext.get().references.map((reference) => reference.locator),
		).toEqual(['notes/second.md', 'notes/first.md']);
	});

	it('unregisters workspace listeners on dispose', () => {
		const workspace = createWorkspace([]);
		const viewingContext = createViewingContextStore();

		const sync = syncWorkspaceViewingContext({
			workspace: workspace.workspace,
			viewingContext,
		});

		expect(workspace.eventRefs).toHaveLength(3);

		sync.dispose();

		expect(workspace.offref).toHaveBeenCalledTimes(3);
		expect(workspace.eventRefs).toHaveLength(0);
	});
});

describe('ViewingContextSync', () => {
	it('initializes enabled from the app setting while still syncing references', () => {
		const file = createFile('notes/private.md', 10);
		const workspace = createWorkspace([createMarkdownLeaf(file)]);
		const settings = createSettingsStore(false);

		const { viewingContext } = renderViewingContextSync({
			settings,
			workspace: workspace.workspace,
		});

		workspace.emitLayoutReady();

		expect(viewingContext.get()).toMatchObject({
			enabled: false,
			references: [
				expect.objectContaining({
					type: 'file',
					locator: 'notes/private.md',
				}),
			],
		});
	});

	it('does not reinitialize the same agent after remount', () => {
		const workspace = createWorkspace([]);
		const settings = createSettingsStore(false);
		const viewingContext = createViewingContextStore();
		const agent = createAgent(viewingContext);

		const { unmount } = renderViewingContextSync({
			agent,
			settings,
			viewingContext,
			workspace: workspace.workspace,
		});
		expect(viewingContext.get().enabled).toBe(false);

		viewingContext.set((draft) => {
			draft.enabled = true;
		});
		unmount();

		renderViewingContextSync({
			agent,
			settings,
			viewingContext,
			workspace: workspace.workspace,
		});

		expect(viewingContext.get().enabled).toBe(true);
	});
});

describe('ViewingContextHeader', () => {
	it('renders the synced file count in the prompt header', () => {
		renderViewingContextHeader({
			viewingContext: createViewingContextStore({
				enabled: true,
				references: [
					{ type: 'file', locator: 'notes/first.md' },
					{ type: 'file', locator: 'notes/second.md' },
				],
			}),
		});

		expect(
			screen.getByRole('button', { name: 'Hide open notes from agent' })
				.textContent,
		).toContain('Agent sees 2 files');
		expect(screen.getByText('2')).toBeTruthy();
	});

	it('toggles sharing for the active agent while preserving references', () => {
		const viewingContext = createViewingContextStore({
			enabled: true,
			references: [{ type: 'file', locator: 'notes/current.md' }],
		});

		renderViewingContextHeader({
			viewingContext,
		});

		fireEvent.click(
			screen.getByRole('button', { name: 'Hide open notes from agent' }),
		);

		expect(viewingContext.get()).toMatchObject({
			enabled: false,
			references: [
				expect.objectContaining({
					type: 'file',
					locator: 'notes/current.md',
				}),
			],
		});
		expect(screen.getByText('Open notes hidden')).toBeTruthy();

		fireEvent.click(
			screen.getByRole('button', { name: 'Share open notes with agent' }),
		);

		expect(viewingContext.get().enabled).toBe(true);
		expect(
			screen.getByRole('button', { name: 'Hide open notes from agent' })
				.textContent,
		).toContain('Agent sees 1 file');
		expect(screen.getByText('1')).toBeTruthy();
	});
});
