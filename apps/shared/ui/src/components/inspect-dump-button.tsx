import { useCallback, useEffect, useRef, useState } from 'react';

import { coreStateHandle, inspectRuntime } from '@franklin/extensions';
import { useAgent } from '@franklin/react';
import { Bug, Check } from 'lucide-react';

import { Button, type ButtonProps } from '../primitives/button.js';

export interface InspectDumpButtonProps {
	onCopied?: () => void;
	onCopyError?: (error: unknown) => void;
	successDurationMs?: number;
	buttonProps?: Pick<ButtonProps, 'className' | 'size' | 'variant'>;
}

export function InspectDumpButton({
	onCopied,
	onCopyError,
	successDurationMs = 2000,
	buttonProps,
}: InspectDumpButtonProps) {
	const runtime = useAgent();
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef(0);

	useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

	const handleClick = useCallback(() => {
		if (copied) return;

		void inspectRuntime(runtime, coreStateHandle(runtime))
			.then((dump) =>
				navigator.clipboard.writeText(JSON.stringify(dump, null, 2)),
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
			title={copied ? 'Inspect dump copied' : 'Copy inspect dump'}
			aria-label={copied ? 'Inspect dump copied' : 'Copy inspect dump'}
		>
			{copied ? <Check className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
		</Button>
	);
}
