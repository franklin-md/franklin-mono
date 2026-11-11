import { useEffect, useRef, useState } from 'react';
import { Inbox, LoaderCircle, Split } from 'lucide-react';
import { Button, Popover, PopoverAnchor, PopoverContent } from '@franklin/ui';
import { errorMessage } from '../controller/error.js';
import type { CaptureAction, CaptureAnchor } from './types.js';

type Props = {
	anchor: CaptureAnchor;
	onSubmit: (action: CaptureAction) => Promise<void>;
	onClose: (restoreFocus: boolean) => void;
	onContent?: (element: HTMLDivElement | null) => void;
};

const actions = [
	{ id: 'quick-add', label: 'QuickAdd', description: 'Add one question', icon: Inbox },
	{ id: 'thought-dump', label: 'ThoughtDump', description: 'Extract questions from these thoughts', icon: Split },
] as const;

export function CapturePanel({ anchor, onSubmit, onClose, onContent }: Props) {
	const content = useRef<HTMLDivElement | null>(null);
	const pending = useRef(false);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState<CaptureAction>();
	const [error, setError] = useState<string>();
	async function submit(action: CaptureAction) {
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
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
		if (!busy) content.current?.querySelector<HTMLButtonElement>('button')?.focus();
	}, [busy, failed]);
	useEffect(() => {
		const win = content.current?.ownerDocument.defaultView;
		if (!win) return;
		const handleKey = (event: KeyboardEvent) => {
			const element = content.current;
			if (!element?.contains(element.ownerDocument.activeElement) || event.isComposing) return;
			if (event.altKey || event.ctrlKey || event.metaKey) return;
			const buttons = [...element.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
			const index = buttons.findIndex((button) => button === element.ownerDocument.activeElement);
			switch (event.key) {
				case 'Escape': onClose(true); break;
				case 'ArrowDown': buttons[(index + 1) % buttons.length]?.focus(); break;
				case 'ArrowUp': buttons[(index + buttons.length - 1) % buttons.length]?.focus(); break;
				case 'Home': buttons[0]?.focus(); break;
				case 'End': buttons.at(-1)?.focus(); break;
				case 'Enter': buttons[index]?.click(); break;
				case 'Tab':
					// Keep browser focus navigation without Obsidian treating Tab as an editor command.
					event.stopPropagation();
					return;
				default: return;
			}
			event.preventDefault();
			event.stopPropagation();
		};
		// Obsidian handles hotkeys before React's delegated events reach a portal.
		// Capture at the owning window so chooser keys cannot also edit the note.
		win.addEventListener('keydown', handleKey, true);
		return () => win.removeEventListener('keydown', handleKey, true);
	}, [onClose]);
	return <Popover open onOpenChange={(open) => { if (!open) onClose(false); }}>
		<PopoverAnchor virtualRef={{ current: anchor }} />
		<PopoverContent ref={(element) => { content.current = element; onContent?.(element); }}
			aria-label="Inbox capture chooser" align="start" sideOffset={6}
			collisionPadding={8} updatePositionStrategy="always"
			className="box-border w-72 max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-auto p-1 font-sans text-sm motion-reduce:animate-none"
			onOpenAutoFocus={(event) => { event.preventDefault(); content.current?.querySelector('button')?.focus(); }}
			onCloseAutoFocus={(event) => event.preventDefault()}
		>
			{failed ? <Button type="button" variant="ghost" className="w-full justify-start" disabled={busy}
				onClick={() => { void submit(failed); }}>Retry {actions.find((action) => action.id === failed)?.label}</Button>
				: actions.map(({ id, label, description, icon: Icon }) => <Button key={id}
					type="button" variant="ghost" disabled={busy}
					className="h-auto w-full justify-start gap-3 px-3 py-2 text-left focus-visible:bg-accent focus-visible:text-accent-foreground"
					onClick={() => { void submit(id); }}>
					<Icon size={16} aria-hidden="true" />
					<span><span className="block">{label}</span><span className="block text-xs font-normal text-muted-foreground">{description}</span></span>
				</Button>)}
			{busy && <p role="status" className="m-0 flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"><LoaderCircle size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Saving…</p>}
			{error && <p role="alert" className="m-0 px-3 py-2 text-xs text-[var(--text-error)] wrap-anywhere">{error}</p>}
		</PopoverContent>
	</Popover>;
}
