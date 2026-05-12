import { faviconUrl } from '../lib/display-url.js';
import { cn } from '../lib/cn.js';

export interface FaviconProps {
	hostname: string;
	className?: string;
}

export function Favicon({ hostname, className }: FaviconProps) {
	return (
		<img
			src={faviconUrl(hostname)}
			alt=""
			className={cn(
				'inline-block size-[0.9em] shrink-0 rounded-[0.15em] align-[-0.1em]',
				className,
			)}
			onError={(e) => {
				e.currentTarget.style.display = 'none';
			}}
		/>
	);
}
