import type { AnswerRequest } from '../controller/types.js';
import type { InboxRunnerOptions } from './types.js';
import { inboxAnswerExtension } from './extension.js';
import { questionPrompt } from './prompt.js';
import { runInboxRuntime } from './runtime.js';
import { createInboxResearchExtensions } from './research.js';
import { assertFinished } from '../../../shared/agent/turn-end/assert-finished.js';

export function createInboxRunner(options: InboxRunnerOptions) {
	return async (request: AnswerRequest): Promise<void> => {
		const turnEnd = await runInboxRuntime(options, {
			selection: request.question,
			signal: request.signal,
			timeout: 120_000,
			onTrace: request.onTrace,
			prompt: questionPrompt(request),
			extensions: (signal) => [
				...createInboxResearchExtensions({
					vaultName: options.vaultName,
				}),
				inboxAnswerExtension({
					answerInstructions: request.question.answerInstructions,
					submit: async (answer, title, details) => {
						signal.throwIfAborted();
						await request.submit(answer, title, details);
					},
				}),
			],
		});
		assertFinished(turnEnd);
	};
}
