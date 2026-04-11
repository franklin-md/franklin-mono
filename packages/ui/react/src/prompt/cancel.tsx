import type { ReactElement } from 'react';
import { Slot } from '@radix-ui/react-slot';

import { usePrompt } from './context.js';

/**
 * Slot that merges cancel behavior onto its single child element.
 *
 * Injects `onClick`.
 * Props are merged onto the child via Radix Slot (event handlers compose).
 */
export function PromptCancel({ children }: { children: ReactElement }) {
	const { cancel } = usePrompt();

	const slotProps = {
		onClick: cancel,
	} as unknown as React.HTMLAttributes<HTMLElement>;

	return <Slot {...slotProps}>{children}</Slot>;
}
