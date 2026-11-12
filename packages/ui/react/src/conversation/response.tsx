import type { ConversationComponents } from './types.js';
import type { ConversationRenderTurn } from './turn-info/types.js';
import { BlockDispatch } from './block-dispatch.js';

type Props = {
	turn: ConversationRenderTurn;
	components: ConversationComponents;
};

export function ConversationResponse({ turn, components }: Props) {
	const { Activity } = components;
	const blocks = turn.response.blocks;
	// The protocol does not label commentary separately from the answer. Text
	// before the last tool/thinking block belongs to activity; trailing text stays
	// visible as it streams, and moves into activity if another action follows.
	const activityEnd = Activity
		? blocks.findLastIndex(
				(block) => block.kind === 'toolUse' || block.kind === 'thinking',
			)
		: -1;
	const activity = blocks.slice(0, activityEnd + 1);

	return (
		<>
			{Activity && activity.length > 0 && (
				<Activity turn={turn} blocks={activity}>
					{activity.map((block, index) => (
						<BlockDispatch key={index} block={block} components={components} />
					))}
				</Activity>
			)}
			{blocks.slice(activityEnd + 1).map((block, index) => (
				<BlockDispatch
					key={activityEnd + 1 + index}
					block={block}
					components={components}
				/>
			))}
		</>
	);
}
