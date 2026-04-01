import { Card } from '@/components/ui/card';

export function ToolCallBlock({ name }: { name: string }) {
	return (
		<Card className="flex-row items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground shadow-none">
			<span>{name}</span>
		</Card>
	);
}
