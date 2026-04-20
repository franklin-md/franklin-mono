import { createToolUseBlock } from '@franklin/react';
import {
	ConversationPanel as SharedConversationPanel,
	InspectDumpButton,
	ToolCardChrome,
	defaultToolRegistry,
} from '@franklin/ui';
import { Notice } from 'obsidian';

const ToolUse = createToolUseBlock(defaultToolRegistry, ToolCardChrome);

export function ConversationPanel() {
	return (
		<SharedConversationPanel
			toolUse={ToolUse}
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
