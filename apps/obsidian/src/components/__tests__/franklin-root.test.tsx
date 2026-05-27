// @vitest-environment jsdom

import type { FranklinApp } from '@franklin/agent';
import { useFileCollection } from '@franklin/react';
import { cleanup, render, screen } from '@testing-library/react';
import type { App, EventRef, TFile, Vault } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeFile } from '../../platform/filesystem/test-helpers.js';
import { FranklinRoot } from '../franklin-root.js';

afterEach(() => {
	cleanup();
});

function createMockVault(files: readonly TFile[]) {
	const offref = vi.fn();
	const vault = {
		getFiles: vi.fn(() => [...files]),
		on: vi.fn(() => ({}) as EventRef),
		offref,
	} as unknown as Vault;

	return { offref, vault };
}

function createMockApp(vault: Vault): App {
	return {
		vault,
		workspace: {
			onLayoutReady: (callback: () => void) => {
				callback();
			},
		},
	} as unknown as App;
}

function FileSearchProbe() {
	const collection = useFileCollection();
	const paths = collection.search('diagram').map((item) => item.path);

	return <div data-testid="file-search-result">{paths.join(',')}</div>;
}

function renderRoot(vault: Vault) {
	return render(
		<FranklinRoot
			app={{} as FranklinApp}
			hostActionBindings={[]}
			obsidianApp={createMockApp(vault)}
			requestApiKey={() => undefined}
		>
			<FileSearchProbe />
		</FranklinRoot>,
	);
}

describe('FranklinRoot', () => {
	it('provides an Obsidian-backed file collection to children', () => {
		const { vault } = createMockVault([
			makeFile('notes/today.md'),
			makeFile('assets/diagram.png'),
		]);

		renderRoot(vault);

		expect(screen.getByTestId('file-search-result').textContent).toBe(
			'assets/diagram.png',
		);
	});

	it('disposes the Obsidian file collection on unmount', () => {
		const { offref, vault } = createMockVault([makeFile('notes/today.md')]);
		const { unmount } = renderRoot(vault);

		unmount();

		expect(offref).toHaveBeenCalledTimes(3);
	});
});
