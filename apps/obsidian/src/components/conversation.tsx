import { createToolUseBlock } from '@franklin/react';
import {
	ConversationOnboardingPlaceholder,
	ConversationPanel as SharedConversationPanel,
	InspectDumpButton,
	ToolCardChrome,
} from '@franklin/ui';
import { Notice } from 'obsidian';

import { obsidianToolRegistry } from './tool-registry.js';

const ToolUse = createToolUseBlock(obsidianToolRegistry, ToolCardChrome);

export function ConversationPanel() {
	return (
		<SharedConversationPanel
			components={{
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
