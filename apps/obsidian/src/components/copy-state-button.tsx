import { useCallback, useEffect, useRef, useState } from 'react';

import { useAgent } from '@franklin/react';
import { Button } from '@franklin/ui';
import { Bug, Check } from 'lucide-react';
import { Notice } from 'obsidian';

export function CopyStateButton() {
	const runtime = useAgent();
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef(0);

	useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

	const handleClick = useCallback(() => {
		if (copied) return;
		void runtime.state().then((s) => {
			void navigator.clipboard
				.writeText(JSON.stringify(s, null, 2))
				.then(() => {
					setCopied(true);
					new Notice('Runtime state copied to clipboard');
					timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
				});
		});
	}, [runtime, copied]);

	return (
		<Button
			variant="ghost"
			size="icon"
			className="h-7 w-7"
			onClick={handleClick}
			title="Copy runtime state"
		>
			{copied ? <Check className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
		</Button>
	);
}
