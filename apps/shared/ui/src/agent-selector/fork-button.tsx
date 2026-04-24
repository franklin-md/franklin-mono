import { useCallback, type ComponentType } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';
import type { Session } from '@franklin/extensions';
import { useAgents } from '@franklin/react';
import { MdForkRight } from 'react-icons/md';

import { cn } from '../lib/cn.js';
import { Button } from '../primitives/button.js';

export interface ForkButtonProps {
	icon?: ComponentType<{ className?: string }>;
	onCreated?: (session: Session<FranklinRuntime>) => void;
	className?: string;
}

export function ForkButton({
	icon: Icon = MdForkRight,
	onCreated,
	className,
}: ForkButtonProps) {
	const { activeSessionId, create } = useAgents();
	const disabled = activeSessionId == null;

	const handleClick = useCallback(() => {
		if (activeSessionId == null) return;

		void create({ from: activeSessionId, mode: 'fork' }).then((session) => {
			onCreated?.(session);
		});
	}, [activeSessionId, create, onCreated]);

	return (
		<Button
			variant="ghost"
			size="icon"
			className={cn('h-7 w-7', className)}
			onClick={handleClick}
			disabled={disabled}
			title="Continue in new chat"
			aria-label="Continue in new chat"
		>
			<Icon className="h-3.5 w-3.5" />
		</Button>
	);
}
