import { CornerDownLeft } from 'lucide-react';
import { Button } from '../../primitives/button.js';
import type { ButtonProps } from '../../primitives/button.js';
import { cn } from '../../lib/cn.js';

type Props = Omit<ButtonProps, 'children'> & { compact?: boolean };

export function PromptSubmitButton({
	compact = false,
	className,
	type = 'button',
	...props
}: Props) {
	return (
		<Button
			type={type}
			variant="ghost"
			size="sm"
			className={cn(
				'h-8 shrink-0 gap-1.5 rounded-lg bg-background/80 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-inset ring-ring/40 shadow-sm transition-colors hover:bg-background hover:text-foreground disabled:opacity-35',
				compact && 'h-7 w-7 rounded-md px-0',
				className,
			)}
			{...props}
		>
			<CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
			{!compact && 'Enter'}
		</Button>
	);
}
