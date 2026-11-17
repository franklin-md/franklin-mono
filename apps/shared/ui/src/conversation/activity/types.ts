import type { ReactNode } from 'react';

import type { ToolSummaryIcon } from '../tools/summary.js';

export type ActivityItem = {
	id: string;
	content: ReactNode;
};

export type ActivityIcon = {
	id: string;
	name: string;
	Icon: ToolSummaryIcon;
};

export type ActivityHeaderData = {
	summary: string;
	current?: ActivityItem;
	icons: ActivityIcon[];
	errors: number;
};

export type ActivityDisclosureProps = {
	summary: ReactNode;
	summaryPrefix?: ReactNode;
	current?: ActivityItem;
	running?: boolean;
	errors?: number;
	meta?: ReactNode;
	children: ReactNode;
};
