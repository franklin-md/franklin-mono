import type { ToolCallEntry } from '@franklin/agent/browser';

import { Card } from '@/components/ui/card';

export function ToolCallCard({ entry }: { entry: ToolCallEntry }) {
	return (
		<div className="flex justify-start">
			<Card className="flex-row items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground shadow-none">
				<span>{entry.name}</span>
			</Card>
		</div>
	);
}
