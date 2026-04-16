import { createToolUseBlock } from '@franklin/react';
import {
	ConversationPanel as SharedConversationPanel,
	ToolCardChrome,
	defaultToolRegistry,
} from '@franklin/ui';

const ToolUse = createToolUseBlock(defaultToolRegistry, ToolCardChrome);

export function ConversationPanel() {
	return <SharedConversationPanel toolUse={ToolUse} />;
}
