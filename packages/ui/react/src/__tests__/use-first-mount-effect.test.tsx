import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFirstMountEffect } from '../utils/use-first-mount-effect.js';

describe('useFirstMountEffect', () => {
	it('runs the effect on first mount', () => {
		const effect = vi.fn();

		renderHook(() => {
			useFirstMountEffect(effect);
		});

		expect(effect).toHaveBeenCalledTimes(1);
	});

	it('does not rerun on rerender when the callback identity changes', () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = renderHook(
			({ effect }: { effect: () => void }) => {
				useFirstMountEffect(effect);
			},
			{ initialProps: { effect: first } },
		);

		rerender({ effect: second });

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
	});
});
