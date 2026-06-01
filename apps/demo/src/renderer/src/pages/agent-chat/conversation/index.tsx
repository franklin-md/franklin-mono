import { Prompt } from '@franklin/react';
import {
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
} from '@franklin/ui';

import { ToolUse } from './tools/tool-use.js';

export function ConversationPanel() {
	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<ConversationTranscript components={{ ToolUse }} />
			<Prompt>
				<PromptContainer>
					<PromptEditor />
					<PromptFooter>
						<PromptFooterControls>
							<PromptFooterControlGroup>
								<ModelSelector />
								<ThinkingToggle />
								{process.env.NODE_ENV === 'development' ? (
									<InspectDumpButton />
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
