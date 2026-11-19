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
} from '@franklin/ui';
import { Notice } from 'obsidian';

import { ObsidianText, ObsidianThinking } from './blocks.js';
import { ObsidianUserMessage } from './user-message.js';
import { ViewingContextHeader } from '../viewing-context/header.js';
import { obsidianToolRegistry } from './tool-registry.js';
import { isDevBuild } from '../../../dev/build.js';

export function ConversationPanel() {
	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<ConversationTranscript
				toolRegistry={obsidianToolRegistry}
				components={{
					UserMessage: ObsidianUserMessage,
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
								{isDevBuild && (
									<InspectDumpButton
										onCopied={() =>
											new Notice('Inspect dump copied to clipboard')
										}
									/>
								)}
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
