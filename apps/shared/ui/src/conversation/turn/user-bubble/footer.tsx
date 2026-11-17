import { ChevronRight } from 'lucide-react';

import { cn } from '../../../lib/cn.js';
import { Button } from '../../../primitives/button.js';

interface UserBubbleFooterProps {
	contentId: string;
	expanded: boolean;
	onToggle: () => void;
}

export function UserBubbleFooter({
	contentId,
	expanded,
	onToggle,
}: UserBubbleFooterProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="mt-1 h-6 gap-1 px-1 text-muted-foreground"
			aria-expanded={expanded}
			aria-controls={contentId}
			onClick={onToggle}
		>
			<ChevronRight
				aria-hidden="true"
				className={cn(
					'size-3 transition-transform duration-200 ease-out motion-reduce:transition-none',
					expanded && 'rotate-90',
				)}
			/>
			{expanded ? 'Show less' : 'Show more'}
		</Button>
	);
}
