import { ConversationPanel as SharedConversationPanel } from '@franklin/ui';

import { ToolUse } from './tools/tool-use.js';

export function ConversationPanel() {
	return <SharedConversationPanel toolUse={ToolUse} />;
}
