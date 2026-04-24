import type { ConversationRenderTurn } from '@franklin/react';
import { Check, Copy } from 'lucide-react';

import { useCopyFeedback } from '../../lib/use-copy-feedback.js';
import { IconButton } from '../../primitives/icon-button.js';

export interface CopyButtonProps {
	text: string;
	label?: string;
	className?: string;
	iconClassName?: string;
}

export function CopyButton({
	text,
	label = 'Copy',
	className,
	iconClassName,
}: CopyButtonProps) {
	const { copied, copy } = useCopyFeedback(text);
	return (
		<IconButton
			icon={copied ? Check : Copy}
			onClick={copy}
			className={className}
			iconClassName={iconClassName}
			title={label}
			aria-label={label}
		/>
	);
}

export function getAssistantText(turn: ConversationRenderTurn): string {
	return turn.response.blocks
		.filter((block) => block.kind === 'text')
		.map((block) => block.text)
		.join('\n\n')
		.trim();
}
