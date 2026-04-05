import type { ReactNode } from 'react';
import type { ToolUseBlock } from '@franklin/extensions';

export type ToolStatus = 'in-progress' | 'success' | 'error';

export type ToolRenderProps = {
	block: ToolUseBlock;
	status: ToolStatus;
};

export type ToolRendererEntry = {
	summary: (props: ToolRenderProps) => ReactNode;
	expanded?: (props: ToolRenderProps) => ReactNode;
};

export type ToolRendererRegistry = ReadonlyMap<string, ToolRendererEntry>;

export type ResolvedToolRender = {
	block: ToolUseBlock;
	status: ToolStatus;
	summary: ReactNode;
	expanded?: ReactNode;
};
