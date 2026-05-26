import type { Meta, StoryObj } from '@storybook/react-vite';
import { filesystemBundle } from '@franklin/agent';

import { ToolRenderingMatrix } from './harness.js';

const meta = {
	title: 'Conversation/Tool Rendering/Files',
	component: ToolRenderingMatrix,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof ToolRenderingMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadFile: Story = {
	args: {
		title: 'read_file',
		toolName: filesystemBundle.tools.readFile.name,
		args: { path: 'apps/shared/ui/src/conversation/tools/chrome.tsx' },
		successResultText: 'Read 72 lines.',
		errorResultText: 'File not found.',
	},
};

export const WriteFile: Story = {
	args: {
		title: 'write_file',
		toolName: filesystemBundle.tools.writeFile.name,
		args: {
			path: 'apps/shared/ui/src/conversation/tools/status-icon.tsx',
			content: '',
		},
		successResultText: 'Wrote 0 bytes.',
		errorResultText: 'Permission denied.',
	},
};

export const EditFile: Story = {
	args: {
		title: 'edit_file',
		toolName: filesystemBundle.tools.editFile.name,
		args: {
			path: 'apps/shared/ui/src/conversation/tools/registry/web.tsx',
			edits: [],
		},
		successResultText: 'Applied 1 edit.',
		errorResultText: 'Patch did not apply.',
	},
};

export const Glob: Story = {
	args: {
		title: 'glob',
		toolName: filesystemBundle.tools.glob.name,
		args: { pattern: ['apps/shared/ui/**/*.tsx', 'packages/**/*.ts'] },
		successResultText: 'Found 18 files.',
		errorResultText: 'Glob pattern is invalid.',
	},
};

export const Grep: Story = {
	args: {
		title: 'grep',
		toolName: filesystemBundle.tools.grep.name,
		args: {
			pattern: 'ToolCardChrome',
			path: 'apps/shared/ui/src',
		},
		successResultText: 'Found 4 matches.',
		errorResultText: 'Search failed.',
	},
};
