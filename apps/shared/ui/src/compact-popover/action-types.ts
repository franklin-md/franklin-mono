import type { ComponentType, RefObject } from 'react';

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

export type IconActionProps = {
	action: IconAction;
	busy: boolean;
	disabled: boolean;
	focused: boolean;
	onFocus: () => void;
	onClick: () => void;
};

export type UseIconActionKeysOptions = {
	group: RefObject<HTMLDivElement | null>;
	getButtons: () => HTMLButtonElement[];
	focusAtIndex: (index: number) => void;
};
