import type { ReactNode } from 'react';
import type { ThinkingLevel } from '@franklin/mini-acp';
import type { ProviderGroup } from '../models/catalog.js';

export type ProviderActionRenderer = (group: ProviderGroup) => ReactNode;

// One field: a model is identified by its provider and its ID there.
export type ModelValue = { provider: string; model: string };

export type ModelListProps = {
	catalog: readonly ProviderGroup[];
	value: ModelValue;
	onChange: (value: ModelValue) => void;
	renderProviderAction?: ProviderActionRenderer;
};

export type EffortChoiceProps = {
	value: ThinkingLevel;
	levels: readonly ThinkingLevel[];
	onChange: (level: ThinkingLevel) => void;
};

export type ModelPickerProps = {
	value: ModelValue;
	onChange: (value: ModelValue) => void;
	label?: string;
	className?: string;
	catalog?: readonly ProviderGroup[];
	renderProviderAction?: ProviderActionRenderer;
	effort?: EffortChoiceProps;
};
