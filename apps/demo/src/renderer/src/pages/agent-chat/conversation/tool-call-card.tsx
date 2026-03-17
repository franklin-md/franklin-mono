import type { ToolCallEntry } from '@franklin/agent/browser';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function ToolCallCard({ entry }: { entry: ToolCallEntry }) {
	return (
		<div className="flex justify-start">
			<Card className="flex-row items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground shadow-none">
				<span>{entry.title || entry.toolCallId}</span>
				{entry.status && (
					<Badge variant="outline" className="text-[10px] px-1 py-0">
						{entry.status}
					</Badge>
				)}
			</Card>
		</div>
	);
}
