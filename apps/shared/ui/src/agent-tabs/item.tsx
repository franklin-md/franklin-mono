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
	sessionId: string;
	position: number;
	isActive: boolean;
	onSelect: () => void;
	onRemove: () => void;
};

export function AgentTabsItem({
	sessionId,
	position,
	isActive,
	onSelect,
	onRemove,
}: AgentTabsItemProps) {
	const statusStore = useAgentState(statusExtension.keys.status);
	const status = statusStore.get();
	const title = useConversationTitle();
	const trimmedTitle = title.trim();
	const hasTitle = trimmedTitle.length > 0;
	const displayLabel = hasTitle ? trimmedTitle : 'New chat';
	const accessibleLabel = hasTitle ? displayLabel : `New chat ${position}`;
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
				'group flex min-w-0 items-center gap-px pr-px transition-colors',
				isActive
					? 'border-b-2 border-foreground'
					: 'text-muted-foreground/60 hover:text-muted-foreground',
			)}
		>
			<TabsTrigger
				value={sessionId}
				className="h-7 max-w-44 gap-1 rounded-sm px-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none"
				title={accessibleLabel}
				aria-label={accessibleLabel}
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
				<span
					className={cn(
						'min-w-0 truncate',
						!hasTitle && 'text-muted-foreground',
					)}
				>
					{displayLabel}
				</span>
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
				aria-label={`Delete agent ${accessibleLabel}`}
				onClick={onRemove}
			>
				<X className="h-3 w-3" />
			</Button>
		</div>
	);
}
