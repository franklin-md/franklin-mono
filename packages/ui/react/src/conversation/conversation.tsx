import type { ReactNode } from 'react';
import type { ConversationTurn } from '@franklin/extensions';

import type { ConversationComponents } from './types.js';
import { BlockDispatch } from './block-dispatch.js';
import { getConversationRenderTurns } from './turn-info/get-turns.js';
import type { ConversationRenderTurn } from './turn-info/types.js';

type ConversationProps = {
	turns: ConversationTurn[];
	components: ConversationComponents;
	now?: number;
};

const IdentityTurn = ({
	children,
}: {
	turn: ConversationRenderTurn;
	children: ReactNode;
}) => <>{children}</>;

export function Conversation({ turns, components, now }: ConversationProps) {
	const {
		UserMessage,
		Turn = IdentityTurn,
		AssistantMessage = IdentityTurn,
		Waiting,
		Footer,
		EmptyPlaceholder,
	} = components;
	const renderTurns = getConversationRenderTurns(turns, now);

	if (renderTurns.length === 0 && EmptyPlaceholder) {
		return <EmptyPlaceholder />;
	}

	return (
		<>
			{renderTurns.map((turn) => (
				<Turn key={turn.id} turn={turn}>
					<UserMessage turn={turn} />
					<AssistantMessage turn={turn}>
						{turn.response.blocks.map((block, i) => (
							<BlockDispatch key={i} block={block} components={components} />
						))}
					</AssistantMessage>
					{turn.phase === 'in-progress' && Waiting ? (
						<Waiting turn={turn} />
					) : null}
					{turn.phase === 'complete' && Footer ? <Footer turn={turn} /> : null}
				</Turn>
			))}
		</>
	);
}
