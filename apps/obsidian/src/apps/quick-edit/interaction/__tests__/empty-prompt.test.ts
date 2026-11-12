// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EmptyPrompt } from '../empty-prompt.js';

afterEach(() => {
	vi.restoreAllMocks();
	Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
});

function setup(height: number) {
	const surface = document.createElement('span');
	const box = new DOMRect(100, 20, 16, height);
	vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue(box);
	Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
		configurable: true,
		value: () => new DOMRect(108, 20, 0, height),
	});
	return { surface, box };
}

it.each([18, 24.5, 35])(
	'centres the insertion point with equal vertical clearance in a %spx empty box',
	(height) => {
		const { surface, box } = setup(height);
		const caret = new EmptyPrompt().coordsAt(surface, 0);
		expect(caret.left - box.left).toBe(box.right - caret.right);
		expect(caret.top).toBeGreaterThan(box.top);
		expect(caret.bottom).toBeLessThan(box.bottom);
		expect(caret.top - box.top).toBeCloseTo(box.bottom - caret.bottom);
	},
);

it('keeps the far side at the right edge with ordinary text height', () => {
	const { surface, box } = setup(24.5);
	expect(new EmptyPrompt().coordsAt(surface, 1)).toEqual({
		left: box.right,
		right: box.right,
		top: box.top,
		bottom: box.bottom,
	});
});
