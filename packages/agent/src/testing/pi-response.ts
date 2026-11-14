import {
	createAssistantMessageEventStream,
	type AssistantMessage,
	type Model,
} from '@earendil-works/pi-ai';

export function createPiTestResponse(
	model: Model<string>,
	content: AssistantMessage['content'],
	stopReason: 'stop' | 'toolUse' = 'stop',
) {
	const stream = createAssistantMessageEventStream();
	const message: AssistantMessage = {
		role: 'assistant',
		content,
		stopReason,
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 10,
			output: 5,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 15,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		timestamp: Date.now(),
	};
	queueMicrotask(() => {
		stream.push({ type: 'done', reason: stopReason, message });
	});
	return stream;
}
