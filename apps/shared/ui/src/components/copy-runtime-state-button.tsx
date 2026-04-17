import { useCallback, useEffect, useRef, useState } from 'react';

import { useAgent } from '@franklin/react';
import { Bug, Check } from 'lucide-react';

import { Button, type ButtonProps } from '../primitives/button.js';

export interface CopyRuntimeStateButtonProps {
	onCopied?: () => void;
	onCopyError?: (error: unknown) => void;
	successDurationMs?: number;
	buttonProps?: Pick<ButtonProps, 'className' | 'size' | 'variant'>;
}

export function CopyRuntimeStateButton({
	onCopied,
	onCopyError,
	successDurationMs = 2000,
	buttonProps,
}: CopyRuntimeStateButtonProps) {
	const runtime = useAgent();
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef(0);

	useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

	const handleClick = useCallback(() => {
		if (copied) return;

		void runtime
			.state()
			.then((state) =>
				navigator.clipboard.writeText(JSON.stringify(state, null, 2)),
			)
			.then(() => {
				setCopied(true);
				onCopied?.();
				timeoutRef.current = window.setTimeout(
					() => setCopied(false),
					successDurationMs,
				);
			})
			.catch((error: unknown) => {
				onCopyError?.(error);
			});
	}, [copied, onCopied, onCopyError, runtime, successDurationMs]);

	return (
		<Button
			variant={buttonProps?.variant ?? 'ghost'}
			size={buttonProps?.size ?? 'icon'}
			className={buttonProps?.className ?? 'h-8 w-8'}
			onClick={handleClick}
			title={copied ? 'Runtime state copied' : 'Copy runtime state'}
			aria-label={copied ? 'Runtime state copied' : 'Copy runtime state'}
		>
			{copied ? <Check className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
		</Button>
	);
}
