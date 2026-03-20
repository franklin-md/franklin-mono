import type {
	UserContent,
	AssistantContent,
	ToolResultContent,
} from './content.js';

// ---------------------------------------------------------------------------
// Messages — 3 roles, each with constrained content types
// ---------------------------------------------------------------------------

// Roles × Content matrix:
//
//  role         | text | thinking | image | toolCall
//  -------------|------|----------|-------|----------
//  user         |  ✓   |          |   ✓   |
//  assistant    |  ✓   |    ✓     |   ✓   |    ✓
//  toolResult   |  ✓   |          |   ✓   |

export type UserMessage = {
	role: 'user';
	content: UserContent[];
};

export type AssistantMessage = {
	role: 'assistant';
	content: AssistantContent[];
};

export type ToolResultMessage = {
	role: 'toolResult';
	toolCallId: string;
	content: ToolResultContent[];
};

export type Message = UserMessage | AssistantMessage | ToolResultMessage;
