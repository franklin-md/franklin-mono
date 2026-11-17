import type { ConversationComponents } from './types.js';
import type { ConversationRenderTurn } from './turn-info/types.js';
import { BlockDispatch } from './block-dispatch.js';
import { createActivityFilter } from './activity.js';

type Props = {
	turn: ConversationRenderTurn;
	components: ConversationComponents;
};

export function ConversationResponse({ turn, components }: Props) {
	const { Activity } = components;
	const blocks = turn.response.blocks;
	const content = blocks.map((block, index) => (
		<BlockDispatch key={index} block={block} components={components} />
	));
	if (!Activity) return <>{content}</>;

	const isActivity = createActivityFilter(blocks);
	const activity = blocks.filter((_block, index) => isActivity(index));
	const activityContent = content.filter((_block, index) => isActivity(index));
	const answerContent = content.filter((_block, index) => !isActivity(index));

	return (
		<>
			{activity.length > 0 && (
				<Activity turn={turn} blocks={activity}>
					{activityContent}
				</Activity>
			)}
			{answerContent}
		</>
	);
}
