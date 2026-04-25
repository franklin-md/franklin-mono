import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMiddleButtonEffect } from '../dom/use-middle-button-effect.js';

describe('useMiddleButtonEffect', () => {
	it('runs the effect for middle-button aux clicks', () => {
		const effect = vi.fn();
		const preventDefault = vi.fn();
		const { result } = renderHook(() =>
			useMiddleButtonEffect<HTMLButtonElement>(effect),
		);

		result.current({
			button: 1,
			preventDefault,
		} as unknown as React.MouseEvent<HTMLButtonElement>);

		expect(preventDefault).toHaveBeenCalledTimes(1);
		expect(effect).toHaveBeenCalledTimes(1);
	});

	it('ignores non-middle-button aux clicks', () => {
		const effect = vi.fn();
		const preventDefault = vi.fn();
		const { result } = renderHook(() => useMiddleButtonEffect(effect));

		result.current({
			button: 2,
			preventDefault,
		} as unknown as React.MouseEvent);

		expect(preventDefault).not.toHaveBeenCalled();
		expect(effect).not.toHaveBeenCalled();
	});
});
