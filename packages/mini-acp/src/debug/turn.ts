import type { MuTurn } from '../protocol/types.js';
import type { StreamEvent } from '../types/stream.js';

import {
	renderCancel,
	renderContinue,
	renderPrompt,
	renderStreamEvent,
	renderThrown,
} from './render.js';
import { logLines } from './style.js';

export function debugTurn(turn: MuTurn, label: string): MuTurn {
	async function* record(
		operation: 'prompt' | 'continue',
		opening: string[],
		open: () => AsyncIterable<StreamEvent>,
	): AsyncGenerator<StreamEvent> {
		logLines(label, opening);
		try {
			for await (const event of open()) {
				logLines(label, renderStreamEvent(event));
				yield event;
			}
		} catch (error) {
			logLines(label, renderThrown(operation, error, 2));
			throw error;
		}
	}
	return {
		prompt: (message) =>
			record('prompt', renderPrompt(message), () => turn.prompt(message)),
		continue: () => record('continue', renderContinue(), () => turn.continue()),
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
