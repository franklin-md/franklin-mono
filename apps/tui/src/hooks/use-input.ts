import { useCallback, useState } from 'react';

import type { TuiSession } from '../lib/tui-session.js';

export interface InputState {
	text: string;
	setText: (text: string) => void;
	submit: () => void;
}

export function useInput(session: TuiSession | undefined): InputState {
	const [text, setText] = useState('');

	const submit = useCallback(() => {
		if (!session || !text.trim()) return;
		void session.prompt(text.trim());
		setText('');
	}, [session, text]);

	return { text, setText, submit };
}
