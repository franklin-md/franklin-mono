import { useCallback, useRef, useState } from 'react';
import type { ManagedSession } from '@franklin/react-agents/browser';

export function useSend(session: ManagedSession | undefined) {
	const [input, setInput] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const send = useCallback(() => {
		if (!session || !input.trim()) return;
		void session.prompt(input.trim());
		setInput('');
	}, [session, input]);

	return { input, setInput, inputRef, send };
}
