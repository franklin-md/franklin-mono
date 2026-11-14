import {
	createAssistantMessageEventStream,
	type AssistantMessage,
} from '@earendil-works/pi-ai';
import type { StreamFn } from '@earendil-works/pi-agent-core';

/** Stub only: an exhausted script fails instead of falling through to a provider. */
export function createScriptedProvider(
	responses: readonly Partial<AssistantMessage>[],
) {
	const requests: Array<{
		messages: Parameters<StreamFn>[1]['messages'];
		systemPrompt: string | undefined;
		tools: string[];
		apiKey: string | undefined;
		model: string;
	}> = [];
	const streamFn: StreamFn = (model, context, options) => {
		const script = responses[requests.length];
		requests.push({
			messages: structuredClone(context.messages),
			systemPrompt: context.systemPrompt,
			tools: (context.tools ?? []).map((tool) => tool.name),
			apiKey: options?.apiKey,
			model: model.id,
		});
		if (!script) throw new Error('Unexpected provider request');
		const stream = createAssistantMessageEventStream();
		const message: AssistantMessage = {
			role: 'assistant',
			api: model.api,
			provider: model.provider,
			model: model.id,
			content: [{ type: 'text', text: 'done' }],
			stopReason: 'stop',
			timestamp: 0,
			usage: {
				input: 10,
				output: 2,
				cacheRead: 3,
				cacheWrite: 1,
				totalTokens: 16,
				cost: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, total: 10 },
			},
			...script,
		};
		queueMicrotask(() => {
			if (message.stopReason === 'error' || message.stopReason === 'aborted') {
				stream.push({
					type: 'error',
					reason: message.stopReason,
					error: message,
				});
			} else {
				stream.push({ type: 'start', partial: message });
				for (const [contentIndex, content] of message.content.entries()) {
					if (content.type === 'text')
						stream.push({
							type: 'text_delta',
							contentIndex,
							delta: content.text,
							partial: message,
						});
					if (content.type === 'thinking')
						stream.push({
							type: 'thinking_delta',
							contentIndex,
							delta: content.thinking,
							partial: message,
						});
				}
				stream.push({ type: 'done', reason: message.stopReason, message });
			}
		});
		return stream;
	};
	return { streamFn, requests };
}
