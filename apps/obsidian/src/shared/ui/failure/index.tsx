import type { ReactNode } from 'react';
import { agentStopCategory, type AgentStopCode } from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';
import { TurnEndBlock } from '@franklin/react';
import { defaultTurnEndRegistry } from '@franklin/ui';

type Props = {
	message: string;
	stopCode?: AgentStopCode;
	actions?: ReactNode;
};

// Inbox and Quick Edit failures render through Chat's turn-end renderers.
// Failures without a stop code, such as an unsubmitted answer, are generic, and
// so are finished codes, whose renderers would drop the message and actions.
export function FailureNotice({ message, stopCode, actions }: Props) {
	return (
		<TurnEndBlock
			block={{
				kind: 'turnEnd',
				stopCode: failureCode(stopCode),
				stopMessage: message,
				startedAt: 0,
				endedAt: 0,
			}}
			registry={defaultTurnEndRegistry}
			actions={actions}
		/>
	);
}

function failureCode(stopCode?: AgentStopCode): AgentStopCode {
	return stopCode === undefined || agentStopCategory(stopCode) === 'finished'
		? StopCode.LlmError
		: stopCode;
}
