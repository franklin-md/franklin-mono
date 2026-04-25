import { useCallback, type ComponentType } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';
import type { Session } from '@franklin/extensions';
import { useAgents } from '@franklin/react';
import { MdForkRight } from 'react-icons/md';

import { IconButton } from '../components/icon-button.js';

export interface ForkButtonProps {
	icon?: ComponentType<{ className?: string }>;
	onCreated?: (session: Session<FranklinRuntime>) => void;
	className?: string;
}

export function ForkButton({
	icon = MdForkRight,
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
		<IconButton
			icon={icon}
			className={className}
			onClick={handleClick}
			disabled={disabled}
			title="Continue in new chat"
			aria-label="Continue in new chat"
		/>
	);
}
