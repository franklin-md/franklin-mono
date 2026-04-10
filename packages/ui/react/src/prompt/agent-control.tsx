import type { ReactElement } from 'react';

import { usePrompt } from './context.js';
import { PromptCancel } from './cancel.js';
import { PromptSend } from './send.js';

export interface PromptAgentControlProps {
	readonly send: ReactElement;
	readonly cancel: ReactElement;
}

/**
 * Headless switcher that renders either a send or cancel control
 * based on whether the agent is currently processing a turn.
 *
 * When idle, renders the `send` element wrapped in `PromptSend`.
 * When sending, renders the `cancel` element wrapped in `PromptCancel`.
 */
export function PromptAgentControl({ send, cancel }: PromptAgentControlProps) {
	const { sending } = usePrompt();

	if (sending) return <PromptCancel>{cancel}</PromptCancel>;
	return <PromptSend>{send}</PromptSend>;
}
