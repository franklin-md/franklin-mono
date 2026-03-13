import {
	ArrowRightLeft,
	Brain,
	ChevronRight,
	FileText,
	FilePen,
	Globe,
	Search,
	Terminal,
	ToggleLeft,
	Trash2,
	Wrench,
} from 'lucide-react';
import { useState } from 'react';

import type { ToolKind } from '@agentclientprotocol/sdk';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { ConversationToolCall } from '@/lib/conversation';
import { extractDiffs } from '@/lib/conversation';
import { DiffViewer } from './diff-viewer';

export interface ToolCallCardProps {
	toolCall: ConversationToolCall;
}

const TOOL_ICONS: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	read: FileText,
	edit: FilePen,
	delete: Trash2,
	move: ArrowRightLeft,
	search: Search,
	execute: Terminal,
	think: Brain,
	fetch: Globe,
	switch_mode: ToggleLeft,
	other: Wrench,
};

const STATUS_COLORS: Record<string, string> = {
	pending: 'border-l-muted-foreground',
	in_progress: 'border-l-blue-500',
	completed: 'border-l-green-500',
	failed: 'border-l-destructive',
};

const STATUS_BADGE_VARIANT: Record<
	string,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	pending: 'outline',
	in_progress: 'secondary',
	completed: 'secondary',
	failed: 'destructive',
};

function getToolIcon(kind?: ToolKind) {
	return TOOL_ICONS[kind ?? 'other'] ?? Wrench;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
	const isDone =
		toolCall.status === 'completed' || toolCall.status === 'failed';
	const [isOpen, setIsOpen] = useState(!isDone);

	const Icon = getToolIcon(toolCall.kind);
	const diffs = extractDiffs(toolCall.content);
	const hasDetails =
		toolCall.rawInput != null || toolCall.rawOutput != null || diffs.length > 0;
	const statusColor = STATUS_COLORS[toolCall.status ?? 'pending'];

	return (
		<div
			className={cn(
				'overflow-hidden rounded-lg border border-l-4 bg-card',
				statusColor,
			)}
		>
			{/* Header */}
			<button
				onClick={() => hasDetails && setIsOpen(!isOpen)}
				className={cn(
					'flex w-full items-center gap-2 px-3 py-2 text-sm',
					hasDetails && 'cursor-pointer hover:bg-muted/50',
				)}
			>
				{hasDetails && (
					<ChevronRight
						className={cn(
							'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
							isOpen && 'rotate-90',
						)}
					/>
				)}
				<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="flex-1 truncate text-left font-medium">
					{toolCall.title}
				</span>
				{toolCall.status && (
					<Badge
						variant={STATUS_BADGE_VARIANT[toolCall.status]}
						className="text-[10px]"
					>
						{toolCall.status === 'in_progress' ? 'running' : toolCall.status}
					</Badge>
				)}
			</button>

			{/* Expandable body */}
			{isOpen && hasDetails && (
				<div className="space-y-3 border-t px-3 py-3">
					{/* Raw input */}
					{toolCall.rawInput != null && (
						<div>
							<p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								Input
							</p>
							<pre className="overflow-x-auto rounded-md bg-muted/50 p-2 text-xs">
								{typeof toolCall.rawInput === 'string'
									? toolCall.rawInput
									: JSON.stringify(toolCall.rawInput, null, 2)}
							</pre>
						</div>
					)}

					{/* Diffs */}
					{diffs.map((diff, i) => (
						<DiffViewer key={`${diff.path}-${i}`} diff={diff} />
					))}

					{/* Raw output */}
					{toolCall.rawOutput != null && (
						<div>
							<p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								Output
							</p>
							<pre className="max-h-[200px] overflow-auto rounded-md bg-muted/50 p-2 text-xs">
								{typeof toolCall.rawOutput === 'string'
									? toolCall.rawOutput
									: JSON.stringify(toolCall.rawOutput, null, 2)}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
