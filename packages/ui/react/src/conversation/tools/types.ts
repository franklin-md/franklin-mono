import type { ReactNode } from 'react';
import type {
	ToolArgsOf,
	ToolOutputOf,
	ToolSpec,
	ToolUseBlock,
} from '@franklin/agent';

export type ToolStatus = 'in-progress' | 'success' | 'error';

export type ToolRenderProps<TArgs = unknown, TOutput = unknown> = {
	block: ToolUseBlock<TOutput>;
	status: ToolStatus;
	args: TArgs;
};

export type ToolRendererEntry<TArgs = unknown, TOutput = unknown> = {
	summary(props: ToolRenderProps<TArgs, TOutput>): ReactNode;
	expanded?(props: ToolRenderProps<TArgs, TOutput>): ReactNode;
};

export type ToolRendererBinding<S extends ToolSpec = ToolSpec> = readonly [
	name: S['name'],
	entry: ToolRendererEntry<ToolArgsOf<S>, ToolOutputOf<S>>,
];

export type ToolRendererRegistryEntries = readonly (readonly [
	string,
	ToolRendererEntry,
])[];

export type ToolRendererRegistry = ReadonlyMap<string, ToolRendererEntry>;

export type ResolvedToolRender = {
	block: ToolUseBlock;
	status: ToolStatus;
	summary: ReactNode;
	expanded?: ReactNode;
};
