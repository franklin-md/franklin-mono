import type { AnswerRequest } from '../controller/types.js';
import type { InboxRunnerOptions } from './types.js';
import { inboxAnswerExtension } from './extension.js';
import { questionPrompt } from './prompt.js';
import { runInboxRuntime } from './runtime.js';
import { createInboxResearchExtensions } from './research.js';
import { ResearchRecorder } from '../capture/evidence/recorder.js';

export function createInboxRunner(options: InboxRunnerOptions) {
	return async (request: AnswerRequest): Promise<void> => {
		const prompt = questionPrompt(request);
		const evidence = options.evidence
			? new ResearchRecorder(request, prompt, options.evidence)
			: undefined;
		try {
			await runInboxRuntime(options, {
				selection: request.question,
				signal: request.signal,
				timeout: 120_000,
				prompt,
				evidence,
				extensions: (signal) => [
					...createInboxResearchExtensions({
						vaultName: options.vaultName,
						referenceCache: options.referenceCache,
					}),
					inboxAnswerExtension({
						answerInstructions: request.question.answerInstructions,
						submit: async (answer, title) => {
							signal.throwIfAborted();
							await evidence?.accept();
							await request.submit(answer, title);
						},
					}),
					...(evidence ? [evidence.extension] : []),
				],
			});
		} finally {
			await evidence?.interrupt();
		}
	};
}
