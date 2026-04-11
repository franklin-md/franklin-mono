import type { ReactElement } from 'react';
import { Slot } from '@radix-ui/react-slot';

import { usePrompt } from './context.js';

/**
 * Slot that merges prompt text behavior onto its single child element.
 *
 * Injects `value`, `onChange`, `onKeyDown` (Enter-to-send), and `disabled`.
 * Props are merged onto the child via Radix Slot (event handlers compose).
 */
export function PromptText({ children }: { children: ReactElement }) {
	const { input, setInput, send, cancel, sending } = usePrompt();

	// Slot's TS types are HTMLAttributes<HTMLElement> which lacks textarea-specific
	// props like `value` and `disabled`. Cast through unknown — Slot merges all
	// props onto the child at runtime regardless of its TS surface.
	const slotProps = {
		value: input,
		onChange: (e: { currentTarget: { value: string } }) => {
			setInput(e.currentTarget.value);
		},
		onKeyDown: (e: {
			key: string;
			shiftKey: boolean;
			preventDefault(): void;
		}) => {
			if (e.key === 'Enter' && !e.shiftKey && !sending) {
				e.preventDefault();
				send();
			}
			if (e.key === 'Escape' && sending) {
				e.preventDefault();
				cancel();
			}
		},
	} as unknown as React.HTMLAttributes<HTMLElement>;

	return <Slot {...slotProps}>{children}</Slot>;
}
