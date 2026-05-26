import type { ToolUseBlock } from '@franklin/agent';
import type { JsonObject, JsonValue } from '@franklin/lib';
import { computeToolStatus, createToolUseBlock } from '@franklin/react';

import { ToolCardChrome } from '../../../src/conversation/tools/chrome.js';
import { defaultToolRegistry } from '../../../src/conversation/tools/registry/index.js';

const ToolUse = createToolUseBlock(defaultToolRegistry, ToolCardChrome);

type ToolState = 'in-progress' | 'success' | 'error';

export type ToolRenderingMatrixProps = {
	toolName: string;
	args: JsonObject;
	title?: string;
	inProgressArgs?: JsonObject;
	successArgs?: JsonObject;
	errorArgs?: JsonObject;
	successOutput?: JsonValue;
	errorOutput?: JsonValue;
	successResultText?: string;
	errorResultText?: string;
};

type ToolStateRow = {
	label: string;
	block: ToolUseBlock;
};

function toolResult(text: string, isError: boolean) {
	return {
		content: [{ type: 'text' as const, text }],
		isError,
	};
}

function createToolBlock({
	args,
	endedAt,
	output,
	resultText,
	startedAt,
	state,
	toolName,
}: {
	args: JsonObject;
	endedAt?: number;
	output?: JsonValue;
	resultText: string;
	startedAt: number;
	state: ToolState;
	toolName: string;
}): ToolUseBlock {
	const block: ToolUseBlock = {
		kind: 'toolUse',
		call: {
			type: 'toolCall',
			id: `${toolName}-${state}`,
			name: toolName,
			arguments: args,
		},
		startedAt,
		endedAt,
	};

	if (state !== 'in-progress') {
		block.result = toolResult(resultText, state === 'error');
	}

	if (output !== undefined) {
		block.output = output;
	}

	return block;
}

function createRows({
	args,
	errorArgs,
	errorOutput,
	errorResultText,
	inProgressArgs,
	successArgs,
	successOutput,
	successResultText,
	toolName,
}: ToolRenderingMatrixProps): ToolStateRow[] {
	const now = Date.now();

	return [
		{
			label: 'In progress',
			block: createToolBlock({
				toolName,
				state: 'in-progress',
				args: inProgressArgs ?? args,
				startedAt: now - 30_000,
				resultText: '',
			}),
		},
		{
			label: 'Success',
			block: createToolBlock({
				toolName,
				state: 'success',
				args: successArgs ?? args,
				startedAt: now - 64_000,
				endedAt: now - 62_000,
				output: successOutput,
				resultText: successResultText ?? `${toolName} completed.`,
			}),
		},
		{
			label: 'Error',
			block: createToolBlock({
				toolName,
				state: 'error',
				args: errorArgs ?? args,
				startedAt: now - 44_000,
				endedAt: now - 42_000,
				output: errorOutput,
				resultText: errorResultText ?? `${toolName} failed.`,
			}),
		},
	];
}

export function ToolRenderingMatrix(props: ToolRenderingMatrixProps) {
	const rows = createRows(props);

	return (
		<div className="w-[min(44rem,calc(100vw-3rem))] text-xs">
			{props.title && (
				<div className="mb-3 text-sm font-medium text-foreground">
					{props.title}
				</div>
			)}
			<div className="flex flex-col gap-2">
				{rows.map((row) => {
					const status = computeToolStatus(row.block);

					return (
						<div
							key={status}
							className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 rounded-md px-2 py-1.5 ring-1 ring-inset ring-border/50"
						>
							<div className="shrink-0 text-[11px] font-medium text-muted-foreground">
								{row.label}
							</div>
							<div className="min-w-0">
								<ToolUse block={row.block} status={status} />
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
