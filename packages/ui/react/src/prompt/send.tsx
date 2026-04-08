import type { ReactElement } from 'react';
import { Slot } from '@radix-ui/react-slot';

import { usePrompt } from './context.js';

/**
 * Slot that merges send behavior onto its single child element.
 *
 * Injects `onClick` and `disabled`.
 * Props are merged onto the child via Radix Slot (event handlers compose).
 */
export function PromptSend({ children }: { children: ReactElement }) {
	const { send, canSend } = usePrompt();

	const slotProps = {
		onClick: send,
		disabled: !canSend,
	} as unknown as React.HTMLAttributes<HTMLElement>;

	return <Slot {...slotProps}>{children}</Slot>;
}
