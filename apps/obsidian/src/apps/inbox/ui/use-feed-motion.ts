import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useFeedMotion(container: RefObject<HTMLDivElement | null>) {
	const previous = useRef(new Map<string, number>());
	useLayoutEffect(() => {
		const host = container.current;
		if (!host) return;
		const reduced = host.ownerDocument.defaultView?.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;
		const next = new Map<string, number>();
		for (const element of host.querySelectorAll<HTMLElement>('article[id]')) {
			// Layout coordinates exclude the in-flight insertion transform.
			const top = element.offsetTop;
			next.set(element.id, top);
			const oldTop = previous.current.get(element.id);
			if (!reduced && oldTop !== undefined && Math.abs(oldTop - top) > 1) {
				element.animate(
					[{ translate: `0 ${oldTop - top}px` }, { translate: '0 0' }],
					{ duration: 380, easing: 'cubic-bezier(.22, 1, .36, 1)' },
				);
			}
		}
		previous.current = next;
	});
}
