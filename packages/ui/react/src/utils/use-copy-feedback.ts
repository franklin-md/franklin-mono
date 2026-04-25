import { useCallback, useEffect, useRef, useState } from 'react';

const RESET_MS = 2000;

export function useCopyFeedback(text: string) {
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef(0);

	useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

	const copy = useCallback(() => {
		if (copied || text.length === 0) return;
		void navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			timeoutRef.current = window.setTimeout(() => setCopied(false), RESET_MS);
		});
	}, [text, copied]);

	return { copied, copy };
}
