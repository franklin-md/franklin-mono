import type { TurnClient } from '../../base/types.js';
import type { UserMessage } from '../../types/message.js';
import type { StreamEvent } from '../../types/stream.js';

import {
	renderCancel,
	renderPrompt,
	renderStreamEvent,
	renderThrown,
} from './render.js';
import { line } from './style.js';

export function debugTurn(turn: TurnClient, label: string): TurnClient {
	return {
		async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
			console.log(line(label, renderPrompt(message)));

			try {
				for await (const event of turn.prompt(message)) {
					const formatted = renderStreamEvent(event);
					if (formatted !== null) console.log(line(label, formatted));
					yield event;
				}
			} catch (error) {
				console.log(line(label, renderThrown('prompt', error)));
				throw error;
			}
		},
		async cancel() {
			console.log(line(label, renderCancel()));

			try {
				await turn.cancel();
			} catch (error) {
				console.log(line(label, renderThrown('cancel', error)));
				throw error;
			}
		},
	};
}
