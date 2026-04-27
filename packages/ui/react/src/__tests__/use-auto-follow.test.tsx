// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	getScrollDistanceFromBottom,
	isAtBottom,
} from '../dom/scrollable/metrics.js';
import type { ScrollableMetrics } from '../dom/scrollable/metrics.js';
import { useAutoFollow } from '../dom/scrollable/use-auto-follow.js';
import { useTriggerOnChange } from '../utils/use-trigger-on-change.js';

function setScrollMetrics(element: HTMLElement, metrics: ScrollableMetrics) {
	let scrollHeight = metrics.scrollHeight;
	let scrollTop = metrics.scrollTop;

	Object.defineProperties(element, {
		clientHeight: {
			configurable: true,
			value: metrics.clientHeight,
		},
		scrollHeight: {
			configurable: true,
			get: () => scrollHeight,
			set: (value: number) => {
				scrollHeight = value;
			},
		},
		scrollTop: {
			configurable: true,
			get: () => scrollTop,
			set: (value: number) => {
				scrollTop = value;
			},
		},
	});

	return {
		get scrollTop() {
			return scrollTop;
		},
		set scrollTop(value: number) {
			scrollTop = value;
		},
		get scrollHeight() {
			return scrollHeight;
		},
		set scrollHeight(value: number) {
			scrollHeight = value;
		},
	};
}

function renderAutoFollow(initialMetrics: ScrollableMetrics) {
	globalThis.ResizeObserver = ResizeObserverMock;
	render(<Harness />);
	const viewport = screen.getByTestId('viewport');
	const metrics = setScrollMetrics(viewport, initialMetrics);

	return {
		expectScrollTop(expected: number) {
			expect(metrics.scrollTop).toBe(expected);
		},
		follow() {
			fireEvent.click(screen.getByText('follow'));
		},
		resizeContent(changes: Partial<ScrollableMetrics> = {}) {
			Object.assign(metrics, changes);
			ResizeObserverMock.instances[0]?.resize();
		},
		scroll(changes: Partial<ScrollableMetrics> = {}) {
			Object.assign(metrics, changes);
			fireEvent.scroll(viewport);
		},
	};
}

function Harness() {
	const autoFollow = useAutoFollow<HTMLDivElement>({
		bottomThresholdPx: 24,
	});

	return (
		<>
			<div ref={autoFollow.contentRef} data-testid="content" />
			<div
				ref={autoFollow.viewportRef}
				data-testid="viewport"
				onScroll={autoFollow.handleScroll}
			/>
			<button type="button" onClick={autoFollow.follow}>
				follow
			</button>
		</>
	);
}

function FollowKeyHarness({
	follow,
	resetKey,
}: {
	follow: () => void;
	resetKey?: unknown;
}) {
	useTriggerOnChange(resetKey, follow);
	return null;
}

class ResizeObserverMock implements ResizeObserver {
	static instances: ResizeObserverMock[] = [];

	callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
		ResizeObserverMock.instances.push(this);
	}

	disconnect() {}

	observe() {}

	unobserve() {}

	resize() {
		this.callback([], this);
	}
}

describe('useAutoFollow', () => {
	afterEach(() => {
		cleanup();
		ResizeObserverMock.instances = [];
		globalThis.ResizeObserver = undefined as never;
	});

	describe('scroll metrics', () => {
		it('keeps pure scroll math outside the hook', () => {
			const metrics = {
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 776.5,
			};

			expect(getScrollDistanceFromBottom(metrics)).toBe(23.5);
			expect(
				isAtBottom(metrics, {
					bottomThresholdPx: 24,
				}),
			).toBe(true);
		});
	});

	describe('content growth', () => {
		it('scrolls to the bottom when observed content grows while following', () => {
			const scenario = renderAutoFollow({
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 0,
			});

			scenario.resizeContent({ scrollHeight: 1200 });

			scenario.expectScrollTop(1200);
		});

		it('does not treat a large content burst as a user escape', () => {
			const scenario = renderAutoFollow({
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 800,
			});

			scenario.scroll();
			scenario.scroll({ scrollHeight: 1100 });
			scenario.resizeContent();

			scenario.expectScrollTop(1100);
		});

		it('allows user escape while content grows in the same scroll event', () => {
			const scenario = renderAutoFollow({
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 800,
			});

			scenario.scroll();
			scenario.scroll({ scrollHeight: 1050, scrollTop: 760 });
			scenario.expectScrollTop(760);

			scenario.resizeContent({ scrollHeight: 1100 });

			scenario.expectScrollTop(760);
		});
	});

	describe('user scroll intent', () => {
		it('stops following when the user scrolls up', () => {
			const scenario = renderAutoFollow({
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 800,
			});

			scenario.scroll();
			scenario.scroll({ scrollTop: 700 });
			scenario.resizeContent({ scrollHeight: 1100 });

			// Paused: growth must not yank the viewport to the bottom.
			scenario.expectScrollTop(700);
		});

		it('does not stop following if the user stays within the bottom threshold', () => {
			const scenario = renderAutoFollow({
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 800,
			});

			scenario.scroll();
			scenario.scroll({ scrollTop: 780 });
			scenario.resizeContent({ scrollHeight: 1100 });

			scenario.expectScrollTop(1100);
		});

		it('resumes following when the user scrolls back near the bottom', () => {
			const scenario = renderAutoFollow({
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 700,
			});

			scenario.scroll();
			scenario.scroll({ scrollTop: 780 });
			scenario.resizeContent({ scrollHeight: 1100 });

			scenario.expectScrollTop(1100);
		});

		it('uses threshold math so fractional scrollTop values count as bottom', () => {
			const scenario = renderAutoFollow({
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 776.5,
			});

			// User was paused; scrolling within the bottom threshold snaps back to following.
			scenario.scroll();
			scenario.resizeContent({ scrollHeight: 1100 });

			scenario.expectScrollTop(1100);
		});
	});

	describe('caller controls', () => {
		it('composes caller-owned reset behavior outside useAutoFollow', () => {
			const follow = vi.fn();
			const { rerender } = render(<FollowKeyHarness follow={follow} />);

			expect(follow).not.toHaveBeenCalled();

			rerender(<FollowKeyHarness follow={follow} resetKey="turn-1" />);
			expect(follow).toHaveBeenCalledTimes(1);

			rerender(<FollowKeyHarness follow={follow} resetKey="turn-1" />);
			expect(follow).toHaveBeenCalledTimes(1);

			rerender(<FollowKeyHarness follow={follow} resetKey="turn-2" />);
			expect(follow).toHaveBeenCalledTimes(2);
		});

		it('exposes an imperative follow control that forces scroll-to-bottom', () => {
			const scenario = renderAutoFollow({
				clientHeight: 200,
				scrollHeight: 1000,
				scrollTop: 0,
			});

			scenario.follow();

			scenario.expectScrollTop(1000);
		});
	});
});
