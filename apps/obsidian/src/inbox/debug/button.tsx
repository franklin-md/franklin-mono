import { useEffect, useState } from 'react';
import { Bug, Check, LoaderCircle } from 'lucide-react';
import { Button } from '@franklin/ui';

type Props = {
	load: () => Promise<string>;
	onError: (error: unknown) => void;
};

export function DebugButton({ load, onError }: Props) {
	const [state, setState] = useState<'idle' | 'copying' | 'copied'>('idle');
	useEffect(() => {
		if (state !== 'copied') return;
		const timeout = window.setTimeout(() => setState('idle'), 2000);
		return () => window.clearTimeout(timeout);
	}, [state]);
	async function copy() {
		if (state === 'copying') return;
		setState('copying');
		try {
			await navigator.clipboard.writeText(await load());
			setState('copied');
		} catch (error) {
			setState('idle');
			onError(error);
		}
	}
	const Icon =
		state === 'copied' ? Check : state === 'copying' ? LoaderCircle : Bug;
	const label =
		state === 'copied' ? 'Agent events copied' : 'Copy agent events';
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="study-text-button h-7 border-0 px-2 ring-1 ring-inset ring-input"
			title={label}
			aria-label={label}
			disabled={state === 'copying'}
			onClick={() => {
				void copy();
			}}
		>
			<Icon
				size={12}
				className={state === 'copying' ? 'study-spin' : undefined}
			/>
			{state === 'copied' ? 'Copied' : 'Debug'}
		</Button>
	);
}
