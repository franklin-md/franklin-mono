import type { ReactNode } from 'react';

export type ActivityDisclosureProps = {
	summary: ReactNode;
	summaryPrefix?: ReactNode;
	current?: { id: string; content: ReactNode };
	running?: boolean;
	errors?: number;
	meta?: ReactNode;
	children: ReactNode;
};
