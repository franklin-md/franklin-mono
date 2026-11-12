import { useEffect, useRef, useState } from 'react';
import type { FloatingAnchor } from '@franklin/ui';
import { Button, CompactPopover, IconActionGroup } from '@franklin/ui';
import { errorMessage } from '../controller/error.js';
import { inboxModes } from '../modes/presentation.js';
import type { CaptureAction } from './types.js';

type Props = {
	anchor: FloatingAnchor;
	onSubmit: (action: CaptureAction) => Promise<void>;
	onClose: (restoreFocus: boolean) => void;
	onContent?: (element: HTMLDivElement | null) => void;
};
const actions = [
	{ id: 'quick-add', ...inboxModes.question, label: 'Quick add' },
	{ id: 'thought-dump', ...inboxModes['thought-dump'] },
];

export function CapturePanel({ anchor, onSubmit, onClose, onContent }: Props) {
	const content = useRef<HTMLDivElement | null>(null);
	const pending = useRef(false);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState<CaptureAction>();
	const [selected, setSelected] = useState<CaptureAction>();
	const [error, setError] = useState<string>();
	async function submit(action: CaptureAction) {
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
		setSelected(action);
		setError(undefined);
		try {
			await onSubmit(action);
		} catch (error) {
			setFailed(action);
			setError(errorMessage(error));
		} finally {
			pending.current = false;
			setBusy(false);
		}
	}
	useEffect(() => {
		if (busy) content.current?.focus();
		else content.current?.querySelector<HTMLButtonElement>('button')?.focus();
	}, [busy, failed]);
	return (
		<CompactPopover
			anchor={anchor}
			label="Inbox capture chooser"
			onClose={onClose}
			onContent={(element) => {
				content.current = element;
				onContent?.(element);
			}}
		>
			{failed ? (
				<Button
					type="button"
					variant="ghost"
					className="w-full justify-start text-popover-foreground"
					disabled={busy}
					onClick={() => {
						void submit(failed);
					}}
				>
					Retry {actions.find((action) => action.id === failed)?.label}
				</Button>
			) : (
				<IconActionGroup
					label="Capture actions"
					actions={actions}
					disabled={busy}
					busyId={busy ? selected : undefined}
					onAction={(id) => {
						if (id === 'quick-add' || id === 'thought-dump') void submit(id);
					}}
				/>
			)}
			{busy && (
				<p role="status" className="sr-only">
					Saving…
				</p>
			)}
			{error && (
				<p
					role="alert"
					className="m-0 max-w-64 px-3 py-2 text-xs text-[var(--text-error)] wrap-anywhere"
				>
					{error}
				</p>
			)}
		</CompactPopover>
	);
}
