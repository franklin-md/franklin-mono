import { formatElapsed } from '@franklin/lib';
import {
	useElapsed,
	type ConversationActivityProps,
	type ToolRendererRegistry,
} from '@franklin/react';

import { ActivityDisclosure } from './disclosure.js';
import { getActivityModel } from './model.js';
import { Waiting } from '../turn/waiting.js';

type Props = ConversationActivityProps & { registry: ToolRendererRegistry };
type RunningDurationProps = { startedAt: number };

function RunningDuration({ startedAt }: RunningDurationProps) {
	return <>{formatElapsed(useElapsed(startedAt))}</>;
}

export function ConversationActivity({
	turn,
	blocks,
	registry,
	children,
}: Props) {
	const model = getActivityModel(blocks, registry);
	const running = turn.phase === 'in-progress';
	if (!model.current) {
		return (
			<>
				{children}
				{running && <Waiting turn={turn} />}
			</>
		);
	}
	const writing = turn.response.blocks.at(-1)?.kind === 'text';
	const current = writing
		? { id: 'writing', content: 'Writing response…' }
		: model.current;

	return (
		<ActivityDisclosure
			summary={model.summary}
			summaryPrefix={
				model.icons.length > 0 &&
				model.icons.map(({ id, name, Icon }) => (
					<span key={id} title={name} className="inline-flex size-3">
						<Icon className="size-3" />
					</span>
				))
			}
			current={current}
			running={running}
			errors={model.errors}
			meta={
				running ? (
					<RunningDuration startedAt={turn.timestamp} />
				) : (
					formatElapsed(turn.timing.elapsedMs)
				)
			}
		>
			{children}
		</ActivityDisclosure>
	);
}
