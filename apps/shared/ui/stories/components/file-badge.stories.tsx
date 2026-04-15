import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileBadge } from '../../src/components/file-badge.js';

const meta = {
	title: 'Components/FileBadge',
	component: FileBadge,
} satisfies Meta<typeof FileBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeScript: Story = {
	args: { path: 'packages/agent/src/session.ts' },
};

export const TSX: Story = {
	args: { path: 'apps/demo/src/renderer/src/pages/home.tsx' },
};

export const Markdown: Story = {
	args: { path: 'docs/README.md' },
};

export const YAML: Story = {
	args: { path: '.github/workflows/ci.yml' },
};

export const LongPath: Story = {
	args: {
		path: 'very/deeply/nested/path/to/important-component.tsx',
	},
	decorators: [
		(Story) => (
			<div className="w-48">
				<Story />
			</div>
		),
	],
};
