import type { ComponentType, ReactNode } from 'react';

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

export type IconAction = {
	id: string;
	label: string;
	description?: string;
	icon: ComponentType<{ className?: string }>;
	colorClassName?: string;
	selectedClassName?: string;
};

export type IconActionGroupProps = {
	label: string;
	actions: readonly IconAction[];
	onAction: (id: string) => void;
	busyId?: string;
	disabled?: boolean;
};
