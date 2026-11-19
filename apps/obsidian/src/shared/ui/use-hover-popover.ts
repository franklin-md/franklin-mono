import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';

// Hover or focus opens a Radix popover beside an inline trigger, such as a
// directive pill, without taking editor focus. Spread `root` on `Popover`,
// `trigger` on `PopoverTrigger asChild` and `content` on `PopoverContent`.
// https://www.radix-ui.com/primitives/docs/components/popover
export function useHoverPopover() {
	const [open, setOpen] = useState(false);
	// Radix types the trigger ref as a button even when `asChild` renders a span.
	const trigger = useRef<HTMLButtonElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const hovered = useRef(false);
	const cancelPending = useRef(() => {});
	useEffect(() => () => cancelPending.current(), []);

	function cancelTimer() {
		cancelPending.current();
	}

	function schedule(action: () => void, delay: number) {
		cancelTimer();
		const win = trigger.current?.ownerDocument.defaultView;
		if (!win) return;
		const id = win.setTimeout(action, delay);
		cancelPending.current = () => win.clearTimeout(id);
	}

	function close() {
		cancelTimer();
		setOpen(false);
	}

	function closeAfterLeaving() {
		// Allow crossing the gap between the trigger and its portaled content.
		schedule(() => {
			const active = trigger.current?.ownerDocument.activeElement;
			const focused =
				active &&
				(trigger.current.contains(active) || content.current?.contains(active));
			if (!hovered.current && !focused) setOpen(false);
		}, 180);
	}

	const interactions = {
		onPointerEnter(event: PointerEvent<HTMLElement>) {
			if (event.pointerType === 'touch') return;
			hovered.current = true;
			cancelTimer();
			if (!open) schedule(() => setOpen(true), 300);
		},
		onPointerLeave() {
			hovered.current = false;
			closeAfterLeaving();
		},
		onFocus() {
			cancelTimer();
			setOpen(true);
		},
		onBlur: closeAfterLeaving,
	};

	return {
		close,
		root: {
			open,
			onOpenChange(next: boolean) {
				cancelTimer();
				setOpen(next);
			},
		},
		trigger: {
			ref: trigger,
			...interactions,
			onKeyDown(event: KeyboardEvent<HTMLElement>) {
				if (event.key !== 'Tab' || event.shiftKey || !open || !content.current)
					return;
				// The portal is outside the note's DOM tab order; enter its first control.
				event.preventDefault();
				const first = content.current.querySelector<HTMLElement>(
					'a[href], button:not([disabled]), summary',
				);
				(first ?? content.current).focus();
			},
			onClick(event: MouseEvent<HTMLElement>) {
				// Keep the trigger's own action instead of Radix's click toggle.
				event.preventDefault();
				close();
			},
		},
		content: {
			ref: content,
			...interactions,
			// Hover must not steal editor focus, including when the popover closes.
			onOpenAutoFocus: (event: Event) => event.preventDefault(),
			onCloseAutoFocus: (event: Event) => event.preventDefault(),
			onEscapeKeyDown() {
				const active = content.current?.ownerDocument.activeElement;
				if (active && content.current.contains(active))
					trigger.current?.focus();
			},
		},
	};
}
