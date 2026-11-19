import type { ReactElement, ReactNode } from 'react';
import type { AgentStopCode } from '@franklin/agent';
import { HoverPopover } from '../hover-popover.js';
import { FailureNotice } from './index.js';

type Props = {
	message: string;
	stopCode?: AgentStopCode;
	actions?: ReactNode;
	children: ReactElement;
};

// A compact trigger, such as a directive pill, says "Failed"; hovering or
// focusing it shows the full failure and its actions, sized to the message.
export function FailurePopover({
	message,
	stopCode,
	actions,
	children,
}: Props) {
	return (
		<HoverPopover
			trigger={children}
			label="Failure details"
			className="max-h-[min(20rem,var(--radix-popover-content-available-height))] w-max max-w-[min(20rem,calc(100vw-1rem))] overflow-y-auto p-1"
		>
			{() => (
				<FailureNotice
					message={message}
					stopCode={stopCode}
					actions={actions}
				/>
			)}
		</HoverPopover>
	);
}
