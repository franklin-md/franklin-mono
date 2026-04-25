import {
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
	type UIEventHandler,
} from 'react';

import { isFollowing } from './metrics.js';

export interface UseAutoFollowOptions {
	bottomThresholdPx?: number;
	escapeThresholdPx?: number;
}

export interface AutoFollow<T extends HTMLElement> {
	follow: () => void;
	contentRef: (element: HTMLElement | null) => void;
	handleScroll: UIEventHandler<T>;
	viewportRef: (element: T | null) => void;
}

const defaultBottomThresholdPx = 24;
const defaultEscapeThresholdPx = 64;

export function useAutoFollow<T extends HTMLElement = HTMLElement>({
	bottomThresholdPx = defaultBottomThresholdPx,
	escapeThresholdPx = defaultEscapeThresholdPx,
}: UseAutoFollowOptions = {}): AutoFollow<T> {
	const viewport = useRef<T | null>(null);
	const [content, setContent] = useState<HTMLElement | null>(null);

	const followingRef = useRef(true);
	const scrollHeightRef = useRef(0);
	const scrollTopRef = useRef(0);

	const captureMetrics = useCallback((element: T | null) => {
		scrollHeightRef.current = element?.scrollHeight ?? 0;
		scrollTopRef.current = element?.scrollTop ?? 0;
	}, []);

	const registerViewport = useCallback(
		(element: T | null) => {
			viewport.current = element;
			captureMetrics(element);
		},
		[captureMetrics],
	);
	const registerContent = useCallback((element: HTMLElement | null) => {
		setContent(element);
	}, []);

	const scrollToBottom = useCallback(() => {
		const element = viewport.current;
		if (!element) return;
		// scrollTop is position from top
		// scrollHeight is total height
		// So technically to scroll to bottom you need scrollHeight - clientHeight, but browsers clamp to max possible value.
		element.scrollTop = element.scrollHeight;
		captureMetrics(element);
	}, []);

	const handleScroll = useCallback<UIEventHandler<T>>(
		(event) => {
			const element = event.currentTarget;
			const contentSizeChanged =
				element.scrollHeight !== scrollHeightRef.current;
			// Test that the user has scrolled up
			const activelyScrolledAway = element.scrollTop < scrollTopRef.current;

			captureMetrics(element);

			// Content updates while following are not user intent to escape.
			if (contentSizeChanged && followingRef.current && !activelyScrolledAway) {
				scrollToBottom();
				return;
			}

			followingRef.current = isFollowing(element, {
				bottomThresholdPx,
				escapeThresholdPx,
				following: followingRef.current,
			});
		},
		[bottomThresholdPx, escapeThresholdPx, scrollToBottom],
	);

	useLayoutEffect(() => {
		if (!content || typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver(() => {
			const element = viewport.current;
			if (!element) return;

			const scrollHeight = element.scrollHeight;
			const contentSizeChanged = scrollHeight !== scrollHeightRef.current;
			scrollHeightRef.current = scrollHeight;
			scrollTopRef.current = element.scrollTop;

			if (contentSizeChanged && followingRef.current) {
				scrollToBottom();
			}
		});

		observer.observe(content);
		return () => {
			observer.disconnect();
		};
	}, [content, scrollToBottom]);

	const follow = useCallback(() => {
		followingRef.current = true;
		scrollToBottom();
	}, [scrollToBottom]);

	return {
		contentRef: registerContent,
		viewportRef: registerViewport,
		follow,
		handleScroll,
	};
}
