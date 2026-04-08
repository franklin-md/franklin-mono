import type { ReactElement } from 'react';

/**
 * Structural slot for prompt controls. Currently a passthrough —
 * renders its child with no additional behavior.
 */
export function PromptControls({ children }: { children: ReactElement }) {
	return children;
}
