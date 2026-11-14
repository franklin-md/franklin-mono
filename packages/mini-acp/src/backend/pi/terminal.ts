import type { AssistantMessage } from '@earendil-works/pi-ai';
import { StopCode } from '../../types/stop-code.js';
import type { StepEnd, TurnEnd } from '../../types/stream.js';
import type { Usage } from '../../types/usage.js';
import { narrowPiStopCode } from './translate/error.js';

export function stepTerminal(
	response: AssistantMessage | undefined,
	stepUsage: Usage,
	usage: Usage,
	cancelled: boolean,
	failure: unknown,
): StepEnd | TurnEnd {
	if (cancelled) {
		return { type: 'turnEnd', stopCode: StopCode.Cancelled, stepUsage, usage };
	}
	if (failure !== undefined || !response) {
		return {
			type: 'turnEnd',
			stopCode: StopCode.LlmError,
			stopMessage:
				failure instanceof Error
					? failure.message
					: 'An error occurred while driving the agent',
			stepUsage,
			usage,
		};
	}
	// pi-agent-core may stringify opaque thrown values as '[object Object]'.
	const stopMessage =
		response.errorMessage === '[object Object]'
			? 'unknown error'
			: response.errorMessage;
	const stopCode = narrowPiStopCode(response.stopReason, stopMessage);
	if (
		(stopCode === null || stopCode === StopCode.Finished) &&
		response.content.some((c) => c.type === 'toolCall')
	) {
		return { type: 'stepEnd', stepUsage };
	}
	return {
		type: 'turnEnd',
		stopCode: stopCode ?? StopCode.Finished,
		stopMessage,
		stepUsage,
		usage,
	};
}
