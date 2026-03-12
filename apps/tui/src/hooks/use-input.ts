import { useCallback, useState } from 'react';

import type { AgentHandle } from '@franklin/agent-manager';

export interface InputState {
	text: string;
	setText: (text: string) => void;
	submit: () => void;
}

export function useInput(handle: AgentHandle | undefined): InputState {
	const [text, setText] = useState('');

	const submit = useCallback(() => {
		if (!handle || !text.trim()) return;
		void handle.dispatch({
			type: 'turn.start',
			input: [{ kind: 'user_message', text: text.trim() }],
		});
		setText('');
	}, [handle, text]);

	return { text, setText, submit };
}
