import type { Reference } from '../../modules/references/index.js';

export type ViewedReference = Reference & {
	openedAt?: number;
	modifiedAt?: number;
};

export type ViewingContextState = {
	enabled: boolean;
	references: ViewedReference[];
};
