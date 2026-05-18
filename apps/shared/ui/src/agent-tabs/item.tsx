import { createStatusControl, statusExtension } from '@franklin/extensions';
import {
	useAgentControl,
	useAgentState,
	useAutoMarkRead,
	useConversationTitle,
	useMiddleButtonEffect,
} from '@franklin/react';
import { X } from 'lucide-react';

import { cn } from '../lib/cn.js';
import { Button } from '../primitives/button.js';
import { TabsTrigger } from '../primitives/tabs.js';
import { StatusIndicator } from '../components/status-indicator.js';

type AgentTabsItemProps = {
	label: string;
	sessionId: string;
	isActive: boolean;
	onSelect: () => void;
	onRemove: () => void;
};

export function AgentTabsItem({
	label,
	sessionId,
	isActive,
	onSelect,
	onRemove,
}: AgentTabsItemProps) {
	const statusStore = useAgentState(statusExtension.keys.status);
	const status = statusStore.get();
	const title = useConversationTitle();
	const displayLabel = title || label;
	const control = useAgentControl(
		statusExtension.keys.status,
		createStatusControl,
	);
	const handleMiddleButtonRemove =
		useMiddleButtonEffect<HTMLButtonElement>(onRemove);
	useAutoMarkRead(isActive);

	return (
		<div
			data-testid={`agent-tab-${sessionId}`}
			className={cn(
				'group flex min-w-0 items-center gap-0.5 pr-0.5 transition-colors',
				isActive
					? 'border-b-2 border-foreground'
					: 'text-muted-foreground/60 hover:text-muted-foreground',
			)}
		>
			<TabsTrigger
				value={sessionId}
				className="h-7 max-w-44 gap-1.5 rounded-sm px-2.5 text-xs data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none"
				title={displayLabel}
				onClick={() => {
					control.markRead();
					onSelect();
				}}
				onAuxClick={handleMiddleButtonRemove}
			>
				<span
					data-testid={`agent-tab-status-${sessionId}`}
					data-status={status}
					className="inline-flex"
				>
					<StatusIndicator status={status} />
				</span>
				<span className="min-w-0 truncate">{displayLabel}</span>
			</TabsTrigger>

			<Button
				type="button"
				variant="ghost"
				size="icon"
				className={cn(
					'h-5 w-5 shrink-0 rounded-sm text-muted-foreground opacity-0 transition-opacity hover:text-destructive',
					(isActive || status !== 'idle') && 'opacity-100',
					'group-hover:opacity-100',
				)}
				aria-label={`Delete agent ${displayLabel}`}
				onClick={onRemove}
			>
				<X className="h-3 w-3" />
			</Button>
		</div>
	);
}
