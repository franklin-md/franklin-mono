import { useCallback, useState } from 'react';

import type { AgentStore } from '../lib/agent-store.js';

export interface InputState {
	text: string;
	setText: (text: string) => void;
	submit: () => void;
}

export function useInput(store: AgentStore | undefined): InputState {
	const [text, setText] = useState('');

	const submit = useCallback(() => {
		if (!store || !text.trim()) return;
		void store.prompt(text.trim());
		setText('');
	}, [store, text]);

	return { text, setText, submit };
}
