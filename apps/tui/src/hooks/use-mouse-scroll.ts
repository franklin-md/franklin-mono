import { type RefObject, useEffect } from 'react';
import { useStdin } from 'ink';
import type { ScrollViewRef } from 'ink-scroll-view';

import {
	applyMode,
	mouseTracking,
	parseMouseWheelEvents,
} from '../lib/terminal-modes.js';

interface UseMouseScrollOptions {
	/** Lines to scroll per wheel tick. Defaults to 3. */
	scrollSpeed?: number;
}

export function useMouseScroll(
	scrollRef: RefObject<ScrollViewRef | null>,
	options?: UseMouseScrollOptions,
): void {
	const { internal_eventEmitter } = useStdin();
	const scrollSpeed = options?.scrollSpeed ?? 3;

	// Enable/disable mouse tracking mode on mount/unmount
	useEffect(() => {
		return applyMode(mouseTracking(), process.stdout);
	}, []);

	// Listen for mouse wheel events on Ink's internal event emitter
	useEffect(() => {
		const handleInput = (data: Buffer) => {
			const events = parseMouseWheelEvents(String(data));
			for (const event of events) {
				const ref = scrollRef.current;
				if (!ref) continue;
				if (event.direction === 'up') {
					ref.scrollBy(-scrollSpeed);
				} else {
					// Clamp downward scroll to bottomOffset to prevent scrolling past content
					ref.scrollTo(
						Math.min(
							ref.getScrollOffset() + scrollSpeed,
							ref.getBottomOffset(),
						),
					);
				}
			}
		};

		internal_eventEmitter.on('input', handleInput);
		return () => {
			internal_eventEmitter.removeListener('input', handleInput);
		};
	}, [internal_eventEmitter, scrollRef, scrollSpeed]);
}
