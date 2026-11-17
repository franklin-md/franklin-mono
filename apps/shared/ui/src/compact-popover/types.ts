import type { ReactNode } from 'react';

export type FloatingAnchor = {
	contextElement: HTMLElement;
	getBoundingClientRect: () => DOMRect;
};

export type CompactPopoverProps = {
	anchor: FloatingAnchor;
	label: string;
	children: ReactNode;
	onClose: (restoreFocus: boolean) => void;
	onContent?: (element: HTMLDivElement | null) => void;
};
