import { cn } from '@/lib/utils';

export function SidebarItem({
	name,
	active,
	onClick,
}: {
	name: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
				active
					? 'bg-accent text-accent-foreground'
					: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
			)}
		>
			{name}
		</button>
	);
}
