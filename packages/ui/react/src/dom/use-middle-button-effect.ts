import type { MouseEvent, MouseEventHandler } from 'react';
import { useCallback } from 'react';

export type MiddleButtonEffect<TElement extends Element = Element> = (
	event: MouseEvent<TElement>,
) => void;

export function useMiddleButtonEffect<TElement extends Element = Element>(
	effect: MiddleButtonEffect<TElement>,
): MouseEventHandler<TElement> {
	return useCallback(
		(event) => {
			if (event.button !== 1) {
				return;
			}

			event.preventDefault();
			effect(event);
		},
		[effect],
	);
}
