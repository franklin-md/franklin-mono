// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	getAutoFollowScrollState,
	getScrollDistanceFromBottom,
} from '../dom/auto-follow-metrics.js';
import { useAutoFollow } from '../dom/use-auto-follow.js';
import { useTriggerOnChange } from '../utils/use-trigger-on-change.js';

type ScrollMetrics = {
	clientHeight: number;
	scrollHeight: number;
	scrollTop: number;
};

function setScrollMetrics(element: HTMLElement, metrics: ScrollMetrics) {
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
			<div data-testid="mode">{autoFollow.mode}</div>
			<div data-testid="at-bottom">{String(autoFollow.atBottom)}</div>
			<button type="button" onClick={autoFollow.follow}>
				follow
			</button>
			<button type="button" onClick={autoFollow.pause}>
				pause
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
			getAutoFollowScrollState(metrics, {
				bottomThresholdPx: 24,
				escapeThresholdPx: 64,
				mode: 'paused',
			}),
		).toEqual({ atBottom: true, mode: 'following' });
	});

	it('scrolls to the bottom when observed content size changes while following', () => {
		globalThis.ResizeObserver = ResizeObserverMock;
		render(<Harness />);
		const metrics = setScrollMetrics(screen.getByTestId('viewport'), {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 0,
		});

		ResizeObserverMock.instances[0]?.resize();

		expect(metrics.scrollTop).toBe(1000);
		expect(screen.getByTestId('mode').textContent).toBe('following');
	});

	it('stops following when the user scrolls beyond the escape threshold', () => {
		render(<Harness />);
		const viewport = screen.getByTestId('viewport');
		const metrics = setScrollMetrics(viewport, {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 800,
		});

		metrics.scrollTop = 700;
		fireEvent.scroll(viewport);

		expect(metrics.scrollTop).toBe(700);
		expect(screen.getByTestId('mode').textContent).toBe('paused');
		expect(screen.getByTestId('at-bottom').textContent).toBe('false');
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
		expect(screen.getByTestId('mode').textContent).toBe('following');
		expect(screen.getByTestId('at-bottom').textContent).toBe('true');
	});

	it('does not require caller-owned keys', () => {
		render(<Harness />);

		expect(screen.getByTestId('mode').textContent).toBe('following');
		expect(screen.getByTestId('at-bottom').textContent).toBe('true');
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

	it('exposes imperative follow and pause controls', () => {
		render(<Harness />);
		const metrics = setScrollMetrics(screen.getByTestId('viewport'), {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 0,
		});

		fireEvent.click(screen.getByText('pause'));
		expect(metrics.scrollTop).toBe(0);

		fireEvent.click(screen.getByText('follow'));
		expect(metrics.scrollTop).toBe(1000);
		expect(screen.getByTestId('mode').textContent).toBe('following');
	});

	it('uses threshold math so fractional scrollTop values count as bottom', () => {
		render(<Harness />);
		const viewport = screen.getByTestId('viewport');
		setScrollMetrics(viewport, {
			clientHeight: 200,
			scrollHeight: 1000,
			scrollTop: 776.5,
		});

		fireEvent.scroll(viewport);

		expect(screen.getByTestId('mode').textContent).toBe('following');
		expect(screen.getByTestId('at-bottom').textContent).toBe('true');
	});
});
