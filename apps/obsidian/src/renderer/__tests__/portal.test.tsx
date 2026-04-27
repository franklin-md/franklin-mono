// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePortalContainer } from '@franklin/ui';

import { clearPortalRoot, PortalProvider } from '../portal.js';

afterEach(() => {
	cleanup();
	clearPortalRoot(document);
	document.body.replaceChildren();
});

function createMigratingHost() {
	const hostEl = document.createElement('section');
	let migrateWindow = (_win: Window): unknown => {
		throw new Error('Expected window migration listener to be registered');
	};
	const removeWindowMigratedListener = vi.fn();
	hostEl.onWindowMigrated = vi.fn((listener) => {
		migrateWindow = listener;
		return removeWindowMigratedListener;
	});
	document.body.append(hostEl);
	return {
		hostEl,
		migrateWindow: (win: Window) => migrateWindow(win),
		removeWindowMigratedListener,
	};
}

function renderProvider(hostEl: HTMLElement) {
	const observed: { current: HTMLElement | undefined } = { current: undefined };
	function Probe() {
		observed.current = usePortalContainer();
		return null;
	}
	const result = render(
		<PortalProvider hostEl={hostEl}>
			<Probe />
		</PortalProvider>,
	);
	return { observed, ...result };
}

describe('PortalProvider', () => {
	it('creates a single body-level root and exposes it via the portal context', () => {
		const { hostEl } = createMigratingHost();
		const { observed } = renderProvider(hostEl);

		expect(observed.current).toBeInstanceOf(HTMLElement);
		expect(observed.current?.parentElement).toBe(document.body);
		expect(observed.current?.classList.contains('franklin')).toBe(true);
		expect(observed.current?.dataset.franklinPortalRoot).toBe('true');
		expect(
			document.body.querySelectorAll('[data-franklin-portal-root="true"]'),
		).toHaveLength(1);
	});

	it('reuses the same root across providers in the same document', () => {
		const { hostEl: firstHost } = createMigratingHost();
		const { hostEl: secondHost } = createMigratingHost();

		const first = renderProvider(firstHost);
		const second = renderProvider(secondHost);

		expect(second.observed.current).toBe(first.observed.current);
		expect(
			document.body.querySelectorAll('[data-franklin-portal-root="true"]'),
		).toHaveLength(1);
	});

	it('detaches the window-migrated listener on unmount', () => {
		const { hostEl, removeWindowMigratedListener } = createMigratingHost();
		const { unmount } = renderProvider(hostEl);

		unmount();

		expect(removeWindowMigratedListener).toHaveBeenCalledOnce();
	});

	it('retargets to the new document when the host migrates', () => {
		const { hostEl, migrateWindow } = createMigratingHost();
		const popoutDocument = document.implementation.createHTMLDocument('popout');
		const popoutWindow = { document: popoutDocument } as Window;

		const { observed } = renderProvider(hostEl);
		const initialRoot = observed.current;

		act(() => {
			migrateWindow(popoutWindow);
		});

		expect(observed.current).not.toBe(initialRoot);
		expect(observed.current?.parentElement).toBe(popoutDocument.body);
	});

	it('recreates the root after it has been cleared', () => {
		const { hostEl: firstHost } = createMigratingHost();
		const first = renderProvider(firstHost);
		const firstRoot = first.observed.current;
		first.unmount();
		clearPortalRoot(document);

		const { hostEl: secondHost } = createMigratingHost();
		const { observed } = renderProvider(secondHost);

		expect(observed.current).not.toBe(firstRoot);
		expect(observed.current?.isConnected).toBe(true);
	});
});
