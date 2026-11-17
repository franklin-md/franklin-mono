import type { ComponentType } from 'react';

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
