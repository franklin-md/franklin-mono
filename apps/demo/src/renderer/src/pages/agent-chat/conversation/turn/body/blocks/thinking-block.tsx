export function ThinkingBlock({ text }: { text: string }) {
	return (
		<div className="text-sm text-muted-foreground/60 italic whitespace-pre-wrap">
			{text}
		</div>
	);
}
