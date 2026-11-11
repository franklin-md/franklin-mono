import type { ReactNode } from 'react';
import type { ThinkingLevel } from '@franklin/mini-acp';
import type { CatalogModel, ProviderGroup } from '../models/catalog.js';

export type ProviderActionRenderer = (group: ProviderGroup) => ReactNode;

export type ModelPickerEffortProps = {
	level: ThinkingLevel;
	levels: readonly ThinkingLevel[];
	onChange: (level: ThinkingLevel) => void;
};

export type ModelPickerProps = {
	provider: string;
	model: string;
	onSelect: (provider: string, model: string) => void;
	label?: string;
	catalog?: readonly ProviderGroup[];
	renderProviderAction?: ProviderActionRenderer;
	effort?: ModelPickerEffortProps;
};

export type ModelPickerRootProps = {
	provider: string;
	model: string;
	onSelect: (provider: string, model: string) => void;
	catalog: readonly ProviderGroup[];
	children: ReactNode;
};

export type ModelPickerContextValue = {
	provider: string;
	model: string;
	catalog: readonly ProviderGroup[];
	selectedEntry: CatalogModel | undefined;
	select: (model: CatalogModel) => void;
	view: 'models' | 'effort';
	setView: (view: 'models' | 'effort') => void;
};
