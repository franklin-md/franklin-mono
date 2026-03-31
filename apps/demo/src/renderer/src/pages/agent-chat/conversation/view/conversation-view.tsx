import { useEffect, useRef } from 'react';

import type { ConversationTurn } from '@franklin/extensions';

import { ScrollArea } from '@/components/ui/scroll-area';

import { Turn } from '../turn/turn.js';

export function ConversationView({ turns }: { turns: ConversationTurn[] }) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [turns]);

	return (
		<ScrollArea className="flex-1 p-4">
			<div className="flex flex-col gap-4">
				{turns.length === 0 && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Send a message to start the conversation.
					</p>
				)}
				{turns.map((turn) => (
					<Turn key={turn.id} turn={turn} />
				))}
				<div ref={bottomRef} />
			</div>
		</ScrollArea>
	);
}
