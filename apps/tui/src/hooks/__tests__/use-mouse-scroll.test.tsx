import { EventEmitter } from 'node:events';
import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import type { ScrollViewRef } from 'ink-scroll-view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockEmitter = new EventEmitter();

vi.mock('ink', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...(original as object),
		useStdin: () => ({ internal_eventEmitter: mockEmitter }),
	};
});

vi.mock('../../lib/terminal-modes.js', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...(original as object),
		// Avoid writing escape sequences to process.stdout during tests
		applyMode: vi.fn(() => vi.fn()),
	};
});

// Import after mocks are declared (vitest hoists vi.mock above imports)
const { useMouseScroll } = await import('../use-mouse-scroll.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SGR mouse-wheel escape sequences */
const wheelUp = '\x1b[<64;1;1M';
const wheelDown = '\x1b[<65;1;1M';

/** Wait a tick for React effects to flush in Ink's renderer. */
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function createMockScrollRef(
	overrides?: Partial<ScrollViewRef>,
): ScrollViewRef {
	return {
		scrollTo: vi.fn(),
		scrollBy: vi.fn(),
		scrollToTop: vi.fn(),
		scrollToBottom: vi.fn(),
		getScrollOffset: vi.fn(() => 0),
		getContentHeight: vi.fn(() => 100),
		getViewportHeight: vi.fn(() => 20),
		getBottomOffset: vi.fn(() => 80),
		getItemHeight: vi.fn(() => 1),
		getItemPosition: vi.fn(() => null),
		remeasure: vi.fn(),
		remeasureItem: vi.fn(),
		...overrides,
	};
}

function Harness({
	scrollRef,
	scrollSpeed,
}: {
	scrollRef: React.RefObject<ScrollViewRef | null>;
	scrollSpeed?: number;
}) {
	useMouseScroll(scrollRef, scrollSpeed ? { scrollSpeed } : undefined);
	return <Text>test</Text>;
}

function emit(data: string) {
	mockEmitter.emit('input', Buffer.from(data));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMouseScroll', () => {
	let unmount: () => void;

	beforeEach(() => {
		mockEmitter.removeAllListeners();
		vi.clearAllMocks();
	});

	afterEach(() => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- unmount may not be assigned if render wasn't called
		unmount?.();
	});

	it('scrolls up via scrollBy with negative delta', async () => {
		const ref = createMockScrollRef();
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		emit(wheelUp);

		expect(ref.scrollBy).toHaveBeenCalledWith(-3);
	});

	it('scrolls down via scrollTo clamped to bottomOffset', async () => {
		const ref = createMockScrollRef({
			getScrollOffset: vi.fn(() => 10),
			getBottomOffset: vi.fn(() => 80),
		});
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		emit(wheelDown);

		expect(ref.scrollTo).toHaveBeenCalledWith(13); // 10 + 3
		expect(ref.scrollBy).not.toHaveBeenCalled();
	});

	it('clamps scroll down to bottomOffset when near bottom', async () => {
		const ref = createMockScrollRef({
			getScrollOffset: vi.fn(() => 79),
			getBottomOffset: vi.fn(() => 80),
		});
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		emit(wheelDown);

		// Would be 79 + 3 = 82, clamped to 80
		expect(ref.scrollTo).toHaveBeenCalledWith(80);
	});

	it('does not scroll past bottomOffset when already at bottom', async () => {
		const ref = createMockScrollRef({
			getScrollOffset: vi.fn(() => 80),
			getBottomOffset: vi.fn(() => 80),
		});
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		emit(wheelDown);

		expect(ref.scrollTo).toHaveBeenCalledWith(80);
	});

	it('does not scroll down when content fits in viewport', async () => {
		const ref = createMockScrollRef({
			getScrollOffset: vi.fn(() => 0),
			getBottomOffset: vi.fn(() => 0), // content <= viewport
		});
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		emit(wheelDown);

		// min(0 + 3, 0) = 0 — no movement
		expect(ref.scrollTo).toHaveBeenCalledWith(0);
	});

	it('respects custom scrollSpeed for up', async () => {
		const ref = createMockScrollRef();
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} scrollSpeed={5} />));
		await tick();

		emit(wheelUp);

		expect(ref.scrollBy).toHaveBeenCalledWith(-5);
	});

	it('respects custom scrollSpeed for down', async () => {
		const ref = createMockScrollRef({
			getScrollOffset: vi.fn(() => 0),
			getBottomOffset: vi.fn(() => 80),
		});
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} scrollSpeed={5} />));
		await tick();

		emit(wheelDown);

		expect(ref.scrollTo).toHaveBeenCalledWith(5); // 0 + 5
	});

	it('handles multiple events in a single chunk', async () => {
		const ref = createMockScrollRef({
			getScrollOffset: vi.fn(() => 0),
			getBottomOffset: vi.fn(() => 80),
		});
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		emit(wheelUp + wheelDown);

		expect(ref.scrollBy).toHaveBeenCalledWith(-3);
		expect(ref.scrollTo).toHaveBeenCalledWith(3);
	});

	it('does not crash when scrollRef.current is null', async () => {
		const scrollRef = { current: null };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		expect(() => emit(wheelDown)).not.toThrow();
		expect(() => emit(wheelUp)).not.toThrow();
	});

	it('removes listener on unmount', async () => {
		const ref = createMockScrollRef();
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		unmount();
		await tick();
		emit(wheelUp);

		expect(ref.scrollBy).not.toHaveBeenCalled();
	});

	it('ignores non-mouse-wheel input data', async () => {
		const ref = createMockScrollRef();
		const scrollRef = { current: ref };
		({ unmount } = render(<Harness scrollRef={scrollRef} />));
		await tick();

		emit('hello');
		emit('\x1b[A'); // cursor up, not wheel

		expect(ref.scrollBy).not.toHaveBeenCalled();
		expect(ref.scrollTo).not.toHaveBeenCalled();
	});
});
