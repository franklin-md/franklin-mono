import type { Meta, StoryObj } from '@storybook/react-vite';
import { spawnExtension } from '@franklin/agent';

import { ToolRenderingMatrix } from './harness.js';

const meta = {
	title: 'Conversation/Tool Rendering/Agents',
	component: ToolRenderingMatrix,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof ToolRenderingMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Spawn: Story = {
	args: {
		title: 'spawn',
		toolName: spawnExtension.tools.spawn.name,
		args: {
			name: 'Visual audit',
			prompt: 'Compare the success, error, and pending tool row treatments.',
		},
		successResultText: 'Child agent completed.',
		errorResultText: 'Child agent failed.',
	},
};
