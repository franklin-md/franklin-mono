import { useRef, useState } from 'react';
import { errorMessage } from '../../error/message.js';

// One setting row's save. A second save is refused while one is in flight,
// and a failure is kept for the row to show beneath itself. Resolves whether
// the save succeeded.
export function useRowSave<T>(save: (value: T) => Promise<void>) {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const saving = useRef(false);
	async function run(value: T): Promise<boolean> {
		if (saving.current) return false;
		saving.current = true;
		setPending(true);
		setError('');
		try {
			await save(value);
			return true;
		} catch (error) {
			setError(errorMessage(error));
			return false;
		} finally {
			saving.current = false;
			setPending(false);
		}
	}
	return { run, pending, error };
}
