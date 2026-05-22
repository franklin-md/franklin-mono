import type { BaseRuntime } from '@franklin/extensibility';

export type RuntimeVisibility = 'visible' | 'hidden';

export type DetailsSnapshot = {
	readonly visibility: RuntimeVisibility;
};

export type DetailsState = {
	readonly details: DetailsSnapshot;
};

export type Details = DetailsSnapshot & {
	readonly id: string;
};

export type DetailsRuntime = BaseRuntime & {
	readonly details: Details;
};
