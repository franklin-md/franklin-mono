import { Prompt } from '@franklin/react';
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
	PromptHeader,
	SharedPromptAgentControl,
	ThinkingToggle,
} from '@franklin/ui';
import { Notice } from 'obsidian';

import {
	ObsidianText,
	ObsidianThinking,
} from './conversation-window/blocks.js';
import { ViewingContextHeader } from './conversation-window/viewing-context/header.js';
import { obsidianToolRegistry } from './tool-registry.js';

export function ConversationPanel() {
	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<ConversationTranscript
				toolRegistry={obsidianToolRegistry}
				components={{
					Text: ObsidianText,
					Thinking: ObsidianThinking,
					EmptyPlaceholder: ConversationOnboardingPlaceholder,
				}}
			/>
			<Prompt>
				<PromptContainer>
					<PromptHeader>
						<ViewingContextHeader />
					</PromptHeader>
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
