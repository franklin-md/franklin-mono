import { createToolUseBlock } from '@franklin/react';
import {
	ConversationPanel as SharedConversationPanel,
	CopyRuntimeStateButton,
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
							<CopyRuntimeStateButton
								key="debug"
								onCopied={() => new Notice('Runtime state copied to clipboard')}
							/>,
						]
					: undefined
			}
		/>
	);
}
