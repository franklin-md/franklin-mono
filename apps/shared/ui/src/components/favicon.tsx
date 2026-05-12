import { faviconUrl } from '../lib/display-url.js';
import { cn } from '../lib/cn.js';

export interface FaviconProps {
	hostname: string;
	className?: string;
}

export function Favicon({ hostname, className }: FaviconProps) {
	// Request a larger source bitmap because the rendered size is em-relative;
	// headings and high-DPI displays can otherwise upscale a 16px favicon.
	const sourceSize = 64;

	return (
		<img
			src={faviconUrl(hostname, sourceSize)}
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
