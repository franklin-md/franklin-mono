import type { ReactNode } from 'react';
import type { ToolUseBlock } from '@franklin/extensions';

export type ToolStatus = 'in-progress' | 'success' | 'error';

export type ToolRenderProps<T = any> = {
	block: ToolUseBlock;
	status: ToolStatus;
	args: T;
};

export type ToolRendererEntry<T = any> = {
	summary: (props: ToolRenderProps<T>) => ReactNode;
	expanded?: (props: ToolRenderProps<T>) => ReactNode;
};

export type ToolRendererRegistry = ReadonlyMap<string, ToolRendererEntry>;

export type ResolvedToolRender = {
	block: ToolUseBlock;
	status: ToolStatus;
	summary: ReactNode;
	expanded?: ReactNode;
};
