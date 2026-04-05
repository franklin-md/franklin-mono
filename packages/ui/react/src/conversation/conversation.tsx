import type { ReactNode } from 'react';
import type { ConversationTurn } from '@franklin/extensions';

import type { BlockComponents } from './types.js';
import { BlockDispatch } from './block-dispatch.js';

type ConversationProps = {
	turns: ConversationTurn[];
	components: BlockComponents;
};

const Identity = ({ children }: { children: ReactNode }) => <>{children}</>;

export function Conversation({ turns, components }: ConversationProps) {
	const {
		UserMessage,
		Turn = Identity,
		AssistantMessage = Identity,
	} = components;

	return (
		<>
			{turns.map((turn) => (
				<Turn key={turn.id}>
					<UserMessage message={turn.prompt} />
					<AssistantMessage>
						{turn.response.blocks.map((block, i) => (
							<BlockDispatch key={i} block={block} components={components} />
						))}
					</AssistantMessage>
				</Turn>
			))}
		</>
	);
}
