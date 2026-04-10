import type { TurnClient } from '../../base/types.js';
import type { UserMessage } from '../../types/message.js';
import type { StreamEvent } from '../../types/stream.js';

import {
	renderCancel,
	renderPrompt,
	renderStreamEvent,
	renderThrown,
} from './render.js';
import { logLines } from './style.js';

export function debugTurn(turn: TurnClient, label: string): TurnClient {
	return {
		async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
			logLines(label, renderPrompt(message));

			try {
				for await (const event of turn.prompt(message)) {
					logLines(label, renderStreamEvent(event));
					yield event;
				}
			} catch (error) {
				logLines(label, renderThrown('prompt', error, 2));
				throw error;
			}
		},
		async cancel() {
			logLines(label, renderCancel());

			try {
				await turn.cancel();
			} catch (error) {
				logLines(label, renderThrown('cancel', error));
				throw error;
			}
		},
	};
}
