// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import type { App } from 'obsidian';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
	ObsidianAppProvider,
	useObsidianApp,
} from '../obsidian-app-context.js';

describe('useObsidianApp', () => {
	it('returns the provided Obsidian app', () => {
		const app = {} as App;

		const { result } = renderHook(() => useObsidianApp(), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<ObsidianAppProvider value={app}>{children}</ObsidianAppProvider>
			),
		});

		expect(result.current).toBe(app);
	});

	it('throws outside the Obsidian app provider', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		try {
			expect(() => renderHook(() => useObsidianApp())).toThrow(
				'useObsidianApp must be used inside a <ObsidianAppProvider>',
			);
		} finally {
			spy.mockRestore();
		}
	});
});
