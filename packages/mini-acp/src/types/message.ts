import type { Content } from './content.js';

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
	role: 'user'; // user->agent
	content: Content[];
};

export type AssistantMessage = {
	role: 'assistant'; // agent->user
	content: Content[];
};

// Not sure this should be here?
export type ToolResultMessage = {
	role: 'toolResult';
	toolCallId: string;
	content: Content[];
};

export type Message = UserMessage | AssistantMessage | ToolResultMessage;
