import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileCollectionProvider, FuseFileCollection } from '@franklin/react';

import { emptyConversation, multiTurn } from '../fixtures.js';
import { MockAgentDecorator } from '../mock-agent.js';
import { InspectDumpButton } from '../../src/components/inspect-dump-button.js';
import { ConversationPanel } from '../../src/conversation/panel.js';

const fileMentionCollection = new FuseFileCollection([
	{ path: 'notes/daily/2026-05-28.md' },
	{ path: 'notes/research/headless-mentions.md' },
	{ path: 'apps/shared/ui/src/conversation/input/prompt-input.tsx' },
	{ path: 'packages/ui/react/src/file-search/fuse-file-collection.ts' },
]);

const meta = {
	title: 'Conversation/ConversationPanel',
	component: ConversationPanel,
	decorators: [
		(Story) => (
			<MockAgentDecorator turns={multiTurn}>
				<div className="flex h-[600px]">
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
} satisfies Meta<typeof ConversationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	decorators: [
		(Story) => (
			<MockAgentDecorator turns={emptyConversation}>
				<div className="flex h-[600px]">
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
};

export const WithControlAccessory: Story = {
	args: {
		additionalControls: [<InspectDumpButton key="debug" />],
	},
};

export const WithFileMentions: Story = {
	decorators: [
		(Story) => (
			<FileCollectionProvider collection={fileMentionCollection}>
				<Story />
			</FileCollectionProvider>
		),
	],
};
