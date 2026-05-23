import { Bot } from 'lucide-react';

import { spawnExtension } from '@franklin/agent';
import { formatElapsed } from '@franklin/lib';
import {
	createToolRenderer,
	useElapsed,
	type ToolRenderProps,
	type ToolRendererRegistryEntries,
} from '@franklin/react';

import { ToolSummary } from '../summary.js';

type SpawnArgs = {
	name: string;
	prompt: string;
};

type RunningSpawnDurationProps = {
	startedAt: number;
};

type SpawnDurationProps = {
	endedAt?: number;
	startedAt: number;
};

function RunningSpawnDuration({ startedAt }: RunningSpawnDurationProps) {
	return <>{formatElapsed(useElapsed(startedAt))}</>;
}

function SpawnDuration({ endedAt, startedAt }: SpawnDurationProps) {
	if (endedAt !== undefined) {
		return <>{formatElapsed(endedAt - startedAt)}</>;
	}

	return <RunningSpawnDuration startedAt={startedAt} />;
}

function spawnDisplayName(args: { readonly name?: unknown }): string {
	const rawName = typeof args.name === 'string' ? args.name : '';
	const name = rawName.trim();
	return name || 'Child agent';
}

function SpawnSummary({ args, block }: ToolRenderProps<SpawnArgs>) {
	return (
		<ToolSummary icon={Bot} label="Spawn">
			<span className="min-w-0 truncate rounded-sm bg-accent px-1.5 py-0.5 font-medium text-accent-foreground ring-1 ring-inset ring-ring/10">
				{spawnDisplayName(args)}
			</span>
			<span className="ml-auto shrink-0 font-mono tabular-nums text-muted-foreground/60">
				<SpawnDuration startedAt={block.startedAt} endedAt={block.endedAt} />
			</span>
		</ToolSummary>
	);
}

export const agentToolRenderers = [
	createToolRenderer(spawnExtension.tools.spawn, {
		summary: (props) => <SpawnSummary {...props} />,
	}),
] satisfies ToolRendererRegistryEntries;
