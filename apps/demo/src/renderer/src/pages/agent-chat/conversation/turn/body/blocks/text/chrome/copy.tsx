import { useCallback, useEffect, useRef, useState } from 'react';

import { Check, Copy } from 'lucide-react';

import { cn } from '@/lib/utils.js';

export function CopyButton({
	text,
	className,
}: {
	text: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef(0);

	useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

	const handleCopy = useCallback(() => {
		if (copied) return;
		void navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
		});
	}, [text, copied]);

	return (
		<button
			type="button"
			className={cn(
				'h-6 w-6 rounded p-1 text-muted-foreground transition-colors hover:text-foreground',
				className,
			)}
			onClick={handleCopy}
		>
			{copied ? (
				<Check className="h-full w-full" />
			) : (
				<Copy className="h-full w-full" />
			)}
		</button>
	);
}
