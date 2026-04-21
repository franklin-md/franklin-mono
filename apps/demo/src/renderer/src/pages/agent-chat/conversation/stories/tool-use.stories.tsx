import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ToolUseBlock as ToolUseBlockData } from '@franklin/extensions';
import type { ToolStatus } from '@franklin/react';

import { ToolUse } from '../tools/tool-use.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toolBlock(
	name: string,
	args: Record<string, unknown>,
	opts?: { result?: string; isError?: boolean },
): ToolUseBlockData {
	const startedAt = Date.now();
	const settled = opts?.result !== undefined || opts?.isError;
	return {
		kind: 'toolUse',
		call: { type: 'toolCall', id: `tc_${name}`, name, arguments: args },
		result: opts?.result ? [{ type: 'text', text: opts.result }] : undefined,
		isError: opts?.isError,
		startedAt,
		endedAt: settled ? startedAt + 500 : undefined,
	};
}

function ToolRow({
	block,
	status,
}: {
	block: ToolUseBlockData;
	status: ToolStatus;
}) {
	return (
		<div className="w-[480px]">
			<ToolUse block={block} status={status} />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const bashBlock = toolBlock('bash', {
	cmd: 'npm run test',
	description: 'Run unit tests',
});

const bashLongBlock = toolBlock('bash', {
	cmd: 'find . -name "*.ts" -not -path "*/node_modules/*" | xargs grep -l "TODO" | sort | head -20',
	description: 'Find TODOs',
});

const fetchRootBlock = toolBlock('fetch_url', {
	url: 'https://docs.example.com',
});

const fetchPathBlock = toolBlock('fetch_url', {
	url: 'https://docs.example.com/api/v2/endpoints',
});

const readFileBlock = toolBlock('read_file', {
	path: 'packages/agent/src/session.ts',
});

const editFileBlock = toolBlock('edit_file', {
	path: 'packages/agent/src/session.ts',
	old_string: 'foo',
	new_string: 'bar',
});

const writeFileBlock = toolBlock('write_file', {
	path: 'packages/agent/src/config.ts',
});

const globBlock = toolBlock('glob', {
	pattern: '**/*.test.ts',
});

const readJsonBlock = toolBlock('read_file', {
	path: 'tsconfig.json',
});

const writeMarkdownBlock = toolBlock('write_file', {
	path: 'docs/README.md',
});

const fetchInvalidBlock = toolBlock('fetch_url', {
	url: 'not-a-valid-url',
});

const webSearchBlock = toolBlock('search_web', {
	query: 'vitest snapshot testing best practices',
});

const unknownBlock = toolBlock('some_custom_tool', {
	query: 'hello',
});

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

const meta = {
	title: 'Conversation/ToolUse',
	component: ToolRow,
} satisfies Meta<typeof ToolRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BashCommand: Story = {
	args: { block: bashBlock, status: 'success' },
};

export const BashLongCommand: Story = {
	args: { block: bashLongBlock, status: 'in-progress' },
};

export const WebFetchRoot: Story = {
	args: { block: fetchRootBlock, status: 'success' },
};

export const WebFetchWithPath: Story = {
	args: { block: fetchPathBlock, status: 'success' },
};

export const ReadFile: Story = {
	args: { block: readFileBlock, status: 'success' },
};

export const EditFile: Story = {
	args: { block: editFileBlock, status: 'in-progress' },
};

export const WriteFile: Story = {
	args: { block: writeFileBlock, status: 'success' },
};

export const GlobSearch: Story = {
	args: { block: globBlock, status: 'success' },
};

export const ReadJsonFile: Story = {
	args: { block: readJsonBlock, status: 'success' },
};

export const WriteMarkdownFile: Story = {
	args: { block: writeMarkdownBlock, status: 'success' },
};

export const WebFetchInvalidUrl: Story = {
	args: { block: fetchInvalidBlock, status: 'error' },
};

export const WebSearch: Story = {
	args: { block: webSearchBlock, status: 'success' },
};

export const UnknownTool: Story = {
	args: { block: unknownBlock, status: 'error' },
};
