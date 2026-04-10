import type { StreamEvent, Message, TurnEnd } from '../types/index.js';

export type CollectResult = {
	messages: Message[];
	turnEnd: TurnEnd | undefined;
};

export async function collect(
	stream: AsyncIterable<StreamEvent>,
): Promise<CollectResult> {
	const messages: Message[] = [];
	let turnEnd: TurnEnd | undefined;

	for await (const event of stream) {
		switch (event.type) {
			case 'update':
				messages.push(event.message);
				break;
			case 'turnEnd':
				turnEnd = event;
				break;
			case 'turnStart':
			case 'chunk':
				break;
		}
	}

	return { messages, turnEnd };
}
