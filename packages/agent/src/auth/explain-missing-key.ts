import { StopCode } from '@franklin/mini-acp';

import type { AgentTurnEnd, TurnStreamEvent } from '../modules/core/index.js';
import { TokenRequestError } from './specs/token-error.js';

/**
 * The runtime only sees that no key was set (AuthKeyNotSpecified). When
 * resolving the key failed, report why: a rejected token (400/401) needs a new
 * sign-in, while anything else, such as an outage, is a generic failure that
 * keeps its message.
 */
export async function* explainMissingKey(
	events: AsyncIterable<TurnStreamEvent>,
	failure: () => unknown,
): AsyncIterable<TurnStreamEvent> {
	for await (const event of events) {
		const cause = failure();
		yield event.type === 'turnEnd' &&
		event.stopCode === StopCode.AuthKeyNotSpecified &&
		cause !== undefined
			? explain(event, cause)
			: event;
	}
}

function explain(event: AgentTurnEnd, cause: unknown): AgentTurnEnd {
	const rejected =
		cause instanceof TokenRequestError &&
		(cause.status === 400 || cause.status === 401);
	return {
		...event,
		stopCode: rejected ? StopCode.AuthKeyInvalid : StopCode.LlmError,
		stopMessage:
			cause instanceof Error
				? cause.message
				: 'Credentials could not be loaded.',
	};
}
