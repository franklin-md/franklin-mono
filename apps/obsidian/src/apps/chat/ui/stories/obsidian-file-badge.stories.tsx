import type { Meta, StoryObj } from '@storybook/react-vite';

import { ObsidianFileBadge } from '../obsidian-file-badge.js';

const meta = {
	title: 'Obsidian/FileBadge',
	component: ObsidianFileBadge,
	args: {
		path: 'notes/MEMORY.md',
	},
} satisfies Meta<typeof ObsidianFileBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VaultPath: Story = {};

export const WikiLink: Story = {
	args: {
		path: '[[notes/MEMORY#Overview|Read this note]]',
	},
};

export const TypeScriptPath: Story = {
	args: {
		path: 'packages/agent/src/session.ts',
	},
};
