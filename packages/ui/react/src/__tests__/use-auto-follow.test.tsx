// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	getScrollDistanceFromBottom,
	isFollowing,
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

function Harness() {
	const autoFollow = useAutoFollow<HTMLDivElement>({
		bottomThresholdPx: 24,
		escapeThresholdPx: 64,
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

	it('keeps pure scroll math outside the hook', () => {
		const metrics = {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 776.5,
		};

		expect(getScrollDistanceFromBottom(metrics)).toBe(23.5);
		expect(
			isFollowing(metrics, {
				bottomThresholdPx: 24,
				escapeThresholdPx: 64,
				following: false,
			}),
		).toBe(true);
	});

	it('scrolls to the bottom when observed content grows while following', () => {
		globalThis.ResizeObserver = ResizeObserverMock;
		render(<Harness />);
		const metrics = setScrollMetrics(screen.getByTestId('viewport'), {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 0,
		});

		metrics.scrollHeight = 1200;
		ResizeObserverMock.instances[0]?.resize();

		expect(metrics.scrollTop).toBe(1200);
	});

	it('does not treat a large content burst as a user escape', () => {
		globalThis.ResizeObserver = ResizeObserverMock;
		render(<Harness />);
		const viewport = screen.getByTestId('viewport');
		const metrics = setScrollMetrics(viewport, {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 800,
		});

		fireEvent.scroll(viewport);
		metrics.scrollHeight = 1100;
		fireEvent.scroll(viewport);
		ResizeObserverMock.instances[0]?.resize();

		expect(metrics.scrollTop).toBe(1100);
	});

	it('allows user escape while content grows in the same scroll event', () => {
		globalThis.ResizeObserver = ResizeObserverMock;
		render(<Harness />);
		const viewport = screen.getByTestId('viewport');
		const metrics = setScrollMetrics(viewport, {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 800,
		});

		fireEvent.scroll(viewport);
		metrics.scrollHeight = 1050;
		metrics.scrollTop = 760;
		fireEvent.scroll(viewport);

		expect(metrics.scrollTop).toBe(760);

		metrics.scrollHeight = 1100;
		ResizeObserverMock.instances[0]?.resize();

		expect(metrics.scrollTop).toBe(760);
	});

	it('stops following when the user scrolls beyond the escape threshold', () => {
		globalThis.ResizeObserver = ResizeObserverMock;
		render(<Harness />);
		const viewport = screen.getByTestId('viewport');
		const metrics = setScrollMetrics(viewport, {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 800,
		});

		fireEvent.scroll(viewport);
		metrics.scrollTop = 700;
		fireEvent.scroll(viewport);

		metrics.scrollHeight = 1100;
		ResizeObserverMock.instances[0]?.resize();

		// Paused: growth must not yank the viewport to the bottom.
		expect(metrics.scrollTop).toBe(700);
	});

	it('resumes following when the user scrolls back near the bottom', () => {
		globalThis.ResizeObserver = ResizeObserverMock;
		render(<Harness />);
		const viewport = screen.getByTestId('viewport');
		const metrics = setScrollMetrics(viewport, {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 700,
		});

		fireEvent.scroll(viewport);
		metrics.scrollTop = 780;
		fireEvent.scroll(viewport);
		metrics.scrollHeight = 1100;
		ResizeObserverMock.instances[0]?.resize();

		expect(metrics.scrollTop).toBe(1100);
	});

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
		render(<Harness />);
		const metrics = setScrollMetrics(screen.getByTestId('viewport'), {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 0,
		});

		fireEvent.click(screen.getByText('follow'));
		expect(metrics.scrollTop).toBe(1000);
	});

	it('uses threshold math so fractional scrollTop values count as bottom', () => {
		globalThis.ResizeObserver = ResizeObserverMock;
		render(<Harness />);
		const viewport = screen.getByTestId('viewport');
		const metrics = setScrollMetrics(viewport, {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 776.5,
		});

		// User was paused; scrolling within the bottom threshold snaps back to following.
		fireEvent.scroll(viewport);

		metrics.scrollHeight = 1100;
		ResizeObserverMock.instances[0]?.resize();
		expect(metrics.scrollTop).toBe(1100);
	});
});
