import { X } from 'lucide-react';

import { cn } from '../lib/cn.js';
import { Button } from '../primitives/button.js';

export function DeleteButton({
	onClick,
	className,
}: {
	onClick: () => void;
	className?: string;
}) {
	return (
		<Button
			variant="ghost"
			size="icon"
			className={cn(
				'h-5 w-5 shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100',
				className,
			)}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
		>
			<X className="h-3 w-3" />
		</Button>
	);
}
