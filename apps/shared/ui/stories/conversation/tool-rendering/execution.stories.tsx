import type { Meta, StoryObj } from '@storybook/react-vite';
import { bashExtension } from '@franklin/agent';

import { ToolRenderingMatrix } from './harness.js';

const meta = {
	title: 'Conversation/Tool Rendering/Execution',
	component: ToolRenderingMatrix,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof ToolRenderingMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bash: Story = {
	args: {
		title: 'bash',
		toolName: bashExtension.tools.bash.name,
		args: { cmd: 'npm run test -w @franklin/ui' },
		errorArgs: { cmd: 'npm run test -w @franklin/ui -- --runInBand' },
		successResultText: 'Tests passed.',
		errorResultText: 'Unknown option: --runInBand.',
	},
};
