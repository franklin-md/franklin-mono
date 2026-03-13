import { Bot, User } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ConversationMessage } from '@/lib/conversation';
import { MarkdownContent } from './markdown-content';

export interface MessageBubbleProps {
	message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === 'user';

	return (
		<div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
			{/* Avatar */}
			<div
				className={cn(
					'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
					isUser
						? 'bg-primary text-primary-foreground'
						: 'bg-secondary text-secondary-foreground',
				)}
			>
				{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
			</div>

			{/* Content */}
			<div
				className={cn(
					'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
					isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/60',
				)}
			>
				{isUser ? (
					<p className="whitespace-pre-wrap">{message.text}</p>
				) : (
					<>
						<MarkdownContent text={message.text} />
						{message.isStreaming && (
							<span
								className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle"
								aria-hidden
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}
