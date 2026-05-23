import { z } from 'zod';
import type { Message } from '@franklin/mini-acp';
import {
	emptyToolFilter,
	type SessionSnapshot,
	type ToolFilter,
} from '../../../modules/core/state.js';

const ThinkingLevelV1 = z.enum([
	'off',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
]);

const MessageV1 = z.custom<Message>((value) => {
	if (value === null || typeof value !== 'object') return false;
	const message = value as Record<string, unknown>;
	if (!Array.isArray(message.content)) return false;
	switch (message.role) {
		case 'user':
		case 'assistant':
			return true;
		case 'toolResult':
			return typeof message.toolCallId === 'string';
		default:
			return false;
	}
});

const UsageBreakdownV1 = z.object({
	input: z.number(),
	output: z.number(),
	cacheRead: z.number(),
	cacheWrite: z.number(),
	total: z.number(),
});

const ToolFilterV1 = z.object({
	disabled: z.array(z.string()),
}) satisfies z.ZodType<ToolFilter>;

export const CoreSessionV1 = z.object({
	messages: z.array(MessageV1),
	llmConfig: z.object({
		provider: z.string().optional(),
		model: z.string().optional(),
		reasoning: ThinkingLevelV1.optional(),
	}),
	usage: z.object({
		tokens: UsageBreakdownV1,
		cost: UsageBreakdownV1,
	}),
	toolFilter: ToolFilterV1.optional().transform(
		(value) => value ?? emptyToolFilter(),
	),
}) satisfies z.ZodType<SessionSnapshot>;
