import {
	ConversationPanel as SharedConversationPanel,
	CopyRuntimeStateButton,
} from '@franklin/ui';

import { ToolUse } from './tools/tool-use.js';

export function ConversationPanel() {
	return (
		<SharedConversationPanel
			toolUse={ToolUse}
			additionalControls={
				process.env.NODE_ENV === 'development'
					? [<CopyRuntimeStateButton key="debug" />]
					: undefined
			}
		/>
	);
}
