import type { Message } from '@franklin/mini-acp';
import type { AgentTurnEnd, TurnStreamEvent } from './types.js';

/** Collect one logical runtime turn, including runtime-owned failure codes. */
export async function collectPrompt(stream: AsyncIterable<TurnStreamEvent>) {
	const messages: Message[] = [];
	let turnEnd: AgentTurnEnd | undefined;
	for await (const event of stream) {
		if (event.type === 'update') messages.push(event.message);
		if (event.type === 'turnEnd') turnEnd = event;
	}
	return { messages, turnEnd };
}
