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
			className={cn('h-3.5 w-3.5 shrink-0 rounded-sm', className)}
			onError={(e) => {
				e.currentTarget.style.display = 'none';
			}}
		/>
	);
}
