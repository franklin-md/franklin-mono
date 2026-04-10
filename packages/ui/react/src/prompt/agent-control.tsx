import type { ReactElement } from 'react';
import { Slot } from '@radix-ui/react-slot';

import { usePrompt } from './context.js';

export interface PromptAgentControlProps {
	readonly send: ReactElement;
	readonly cancel: ReactElement;
}

/**
 * Headless switcher that renders either a send or cancel control
 * based on whether the agent is currently processing a turn.
 *
 * When idle, renders the `send` element with `onClick` and `disabled` injected.
 * When sending, renders the `cancel` element with `onClick` injected.
 */
export function PromptAgentControl({ send, cancel }: PromptAgentControlProps) {
	const { send: sendFn, cancel: cancelFn, canSend, sending } = usePrompt();

	if (sending) {
		const cancelProps = {
			onClick: cancelFn,
		} as unknown as React.HTMLAttributes<HTMLElement>;

		return <Slot {...cancelProps}>{cancel}</Slot>;
	}

	const sendProps = {
		onClick: sendFn,
		disabled: !canSend,
	} as unknown as React.HTMLAttributes<HTMLElement>;

	return <Slot {...sendProps}>{send}</Slot>;
}
