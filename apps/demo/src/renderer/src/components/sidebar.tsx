import type { ManagedSession } from '@franklin/react/browser';
import { useAgentManager } from '@franklin/react/browser';

import type { AgentManager } from '@franklin/react/browser';
import { cn } from '@/lib/utils';

interface SidebarProps {
	manager: AgentManager;
	activeId: string | null;
	onSelect: (id: string) => void;
	onSpawn: () => void;
}

function statusColor(status: ManagedSession['status']): string {
	switch (status) {
		case 'idle':
			return 'bg-green-500';
		case 'running':
			return 'bg-yellow-500 animate-pulse';
		case 'error':
			return 'bg-red-500';
		case 'disposed':
			return 'bg-gray-400';
	}
}

function SessionItem({
	session,
	isActive,
	onSelect,
}: {
	session: ManagedSession;
	isActive: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			onClick={onSelect}
			className={cn(
				'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
				isActive
					? 'bg-accent text-accent-foreground'
					: 'hover:bg-muted/50 text-muted-foreground',
			)}
		>
			<span
				className={cn(
					'h-2 w-2 shrink-0 rounded-full',
					statusColor(session.status),
				)}
			/>
			<span className="truncate">{session.id}</span>
		</button>
	);
}

export function Sidebar({
	manager,
	activeId,
	onSelect,
	onSpawn,
}: SidebarProps) {
	const sessions = useAgentManager(manager);

	return (
		<div className="flex h-full w-56 flex-col border-r bg-muted/30">
			<div className="flex items-center justify-between border-b px-3 py-2">
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Sessions
				</span>
				<button
					onClick={onSpawn}
					className="rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
				>
					+ New
				</button>
			</div>
			<div className="flex-1 space-y-0.5 overflow-y-auto p-1">
				{sessions.map((session) => (
					<SessionItem
						key={session.id}
						session={session}
						isActive={session.id === activeId}
						onSelect={() => onSelect(session.id)}
					/>
				))}
				{sessions.length === 0 && (
					<p className="px-2 py-4 text-center text-xs text-muted-foreground">
						No sessions yet
					</p>
				)}
			</div>
		</div>
	);
}
