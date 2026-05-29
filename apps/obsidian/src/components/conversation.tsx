import { createToolUseBlock, Prompt } from '@franklin/react';
import {
	ConversationOnboardingPlaceholder,
	ConversationTranscript,
	InspectDumpButton,
	ModelSelector,
	PromptContainer,
	PromptEditor,
	PromptFooter,
	PromptFooterControlGroup,
	PromptFooterControls,
	SharedPromptAgentControl,
	ThinkingToggle,
	ToolCardChrome,
} from '@franklin/ui';
import { Notice } from 'obsidian';

import {
	ObsidianText,
	ObsidianThinking,
} from './conversation-window/blocks.js';
import { obsidianToolRegistry } from './tool-registry.js';

const ToolUse = createToolUseBlock(obsidianToolRegistry, ToolCardChrome);

export function ConversationPanel() {
	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<ConversationTranscript
				components={{
					Text: ObsidianText,
					Thinking: ObsidianThinking,
					ToolUse,
					EmptyPlaceholder: ConversationOnboardingPlaceholder,
				}}
			/>
			<Prompt>
				<PromptContainer>
					<PromptEditor />
					<PromptFooter>
						<PromptFooterControls>
							<PromptFooterControlGroup>
								<ModelSelector />
								<ThinkingToggle />
								{process.env.NODE_ENV === 'development' ? (
									<InspectDumpButton
										onCopied={() =>
											new Notice('Inspect dump copied to clipboard')
										}
									/>
								) : null}
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
