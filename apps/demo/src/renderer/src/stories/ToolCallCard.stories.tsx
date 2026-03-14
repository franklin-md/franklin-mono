import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToolCallCard } from '@/components/conversation/tool-call-card';

const meta = {
	title: 'Conversation/ToolCallCard',
	component: ToolCallCard,
	parameters: { layout: 'padded' },
	decorators: [
		(Story) => (
			<div className="mx-auto max-w-2xl p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ToolCallCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadFile: Story = {
	args: {
		toolCall: {
			toolCallId: 'tc1',
			title: 'Read src/lib/agent.ts',
			kind: 'read',
			status: 'completed',
			rawOutput:
				'import { spawn } from "child_process";\nimport type { AgentSpec } from "./types";\n\nexport function createAgent(spec: AgentSpec) {\n  // ...\n}',
		},
	},
};

export const EditWithDiff: Story = {
	args: {
		toolCall: {
			toolCallId: 'tc2',
			title: 'Edit src/lib/agent.ts',
			kind: 'edit',
			status: 'completed',
			content: [
				{
					type: 'diff' as const,
					path: 'src/lib/agent.ts',
					oldText:
						'function createAgent(spec: AgentSpec) {\n  const proc = spawn(spec.command, spec.args);\n  return proc;\n}',
					newText:
						'async function createAgent(spec: AgentSpec): Promise<Agent> {\n  const proc = spawn(spec.command, spec.args);\n  await waitForReady(proc);\n  return new Agent(proc);\n}',
				},
			],
		},
	},
};

export const ExecuteCommand: Story = {
	args: {
		toolCall: {
			toolCallId: 'tc3',
			title: 'Run npm test',
			kind: 'execute',
			status: 'completed',
			rawInput: { command: 'npm test' },
			rawOutput:
				'PASS src/__tests__/agent.test.ts\n  Agent\n    ✓ spawns subprocess (12ms)\n    ✓ handles ready signal (8ms)\n\nTest Suites: 1 passed, 1 total\nTests:       2 passed, 2 total',
		},
	},
};

export const InProgress: Story = {
	args: {
		toolCall: {
			toolCallId: 'tc4',
			title: 'Search for "AgentHandle" references',
			kind: 'search',
			status: 'in_progress',
		},
	},
};

export const Failed: Story = {
	args: {
		toolCall: {
			toolCallId: 'tc5',
			title: 'Run npm run build',
			kind: 'execute',
			status: 'failed',
			rawInput: { command: 'npm run build' },
			rawOutput:
				'error TS2345: Argument of type "string" is not assignable to parameter of type "number".\n\nsrc/lib/agent.ts:42:5',
		},
	},
};
