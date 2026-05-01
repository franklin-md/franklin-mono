// @vitest-environment jsdom

import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMounter } from '../mount.js';
import { clearPortalRoot } from '../portal.js';

afterEach(() => {
	clearPortalRoot(document);
	document.body.replaceChildren();
});

describe('createMounter', () => {
	it('mounts children, prepares the host, and cleans up on unmount', () => {
		const contentEl = document.createElement('section');
		const removeWindowMigratedListener = vi.fn();
		contentEl.onWindowMigrated = vi.fn(() => removeWindowMigratedListener);
		document.body.append(contentEl);

		const mounter = createMounter();
		act(() => {
			mounter.mount(contentEl, <div data-testid="child">hello</div>);
		});

		expect(contentEl.classList.contains('franklin')).toBe(true);
		expect(contentEl.classList.contains('franklin-mount-host')).toBe(true);
		expect(contentEl.querySelector('[data-testid="child"]')).not.toBeNull();
		expect(
			document.body.querySelector('[data-franklin-portal-root="true"]'),
		).not.toBeNull();

		act(() => {
			mounter.unmount();
		});

		expect(removeWindowMigratedListener).toHaveBeenCalledOnce();
		expect(contentEl.classList.contains('franklin-mount-host')).toBe(false);
		expect(contentEl.childNodes).toHaveLength(0);
	});

	it('tears down a previous mount when mount is called again', () => {
		const firstHost = document.createElement('section');
		const firstRemove = vi.fn();
		firstHost.onWindowMigrated = vi.fn(() => firstRemove);
		document.body.append(firstHost);

		const secondHost = document.createElement('section');
		const secondRemove = vi.fn();
		secondHost.onWindowMigrated = vi.fn(() => secondRemove);
		document.body.append(secondHost);

		const mounter = createMounter();
		act(() => {
			mounter.mount(firstHost, <div />);
		});
		act(() => {
			mounter.mount(secondHost, <div />);
		});

		expect(firstRemove).toHaveBeenCalledOnce();
		expect(firstHost.classList.contains('franklin-mount-host')).toBe(false);
		expect(secondHost.classList.contains('franklin-mount-host')).toBe(true);

		act(() => {
			mounter.unmount();
		});
		expect(secondRemove).toHaveBeenCalledOnce();
	});
});
