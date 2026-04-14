import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileBadge } from '@franklin/ui';

const meta = {
	title: 'Conversation/FileBadge',
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

export const JSON: Story = {
	args: { path: 'package.json' },
};

export const Markdown: Story = {
	args: { path: 'docs/README.md' },
};

export const CSS: Story = {
	args: { path: 'src/styles/globals.css' },
};

export const Python: Story = {
	args: { path: 'scripts/train.py' },
};

export const Rust: Story = {
	args: { path: 'src/main.rs' },
};

export const Go: Story = {
	args: { path: 'cmd/server/main.go' },
};

export const HTML: Story = {
	args: { path: 'public/index.html' },
};

export const YAML: Story = {
	args: { path: '.github/workflows/ci.yml' },
};

export const NoExtension: Story = {
	args: { path: 'Makefile' },
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
