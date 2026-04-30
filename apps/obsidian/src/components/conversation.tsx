import { createToolUseBlock } from '@franklin/react';
import {
	ConversationOnboardingPlaceholder,
	InspectDumpButton,
	ConversationPanel as SharedConversationPanel,
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
		<SharedConversationPanel
			components={{
				Text: ObsidianText,
				Thinking: ObsidianThinking,
				ToolUse,
				EmptyPlaceholder: ConversationOnboardingPlaceholder,
			}}
			additionalControls={
				process.env.NODE_ENV === 'development'
					? [
							<InspectDumpButton
								key="debug"
								onCopied={() => new Notice('Inspect dump copied to clipboard')}
							/>,
						]
					: undefined
			}
		/>
	);
}
