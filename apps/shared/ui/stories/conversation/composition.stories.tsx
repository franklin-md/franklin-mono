import type { Meta, StoryObj } from '@storybook/react-vite';

import { Prompt } from '@franklin/react';

import { emptyConversation, multiTurn } from '../fixtures.js';
import { MockAgentDecorator } from '../mock-agent.js';
import { InspectDumpButton } from '../../src/components/inspect-dump-button.js';
import {
	ConversationTranscript,
	type ConversationTranscriptProps,
} from '../../src/conversation/transcript.js';
import { ModelSelector } from '../../src/conversation/input/model-selector/selector.js';
import { PromptContainer } from '../../src/conversation/input/prompt-container.js';
import { PromptEditor } from '../../src/conversation/input/prompt-editor.js';
import { PromptFooter } from '../../src/conversation/input/prompt-footer.js';
import {
	PromptFooterControlGroup,
	PromptFooterControls,
} from '../../src/conversation/input/prompt-footer-controls.js';
import { SharedPromptAgentControl } from '../../src/conversation/input/shared-prompt-agent-control.js';
import { ThinkingToggle } from '../../src/conversation/input/thinking-toggle.js';

interface ConversationSurfaceProps extends ConversationTranscriptProps {
	showDebugControl?: boolean;
}

function ConversationSurface({
	components,
	showDebugControl = false,
}: ConversationSurfaceProps) {
	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<ConversationTranscript components={components} />
			<Prompt>
				<PromptContainer>
					<PromptEditor />
					<PromptFooter>
						<PromptFooterControls>
							<PromptFooterControlGroup>
								<ModelSelector />
								<ThinkingToggle />
								{showDebugControl ? <InspectDumpButton /> : null}
							</PromptFooterControlGroup>
							<PromptFooterControlGroup>
								<SharedPromptAgentControl />
							</PromptFooterControlGroup>
						</PromptFooterControls>
					</PromptFooter>
				</PromptContainer>
			</Prompt>
		</div>
	);
}

const meta = {
	title: 'Conversation/Composition',
	component: ConversationSurface,
	decorators: [
		(Story) => (
			<MockAgentDecorator turns={multiTurn}>
				<div className="flex h-[600px]">
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
} satisfies Meta<typeof ConversationSurface>;

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

export const WithManualFooterControls: Story = {
	args: {
		showDebugControl: true,
	},
};
