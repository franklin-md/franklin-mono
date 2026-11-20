import { StoredThinkingLevel } from '@franklin/agent';
import { z } from 'zod';
import { presetListSchema } from '../../../shared/preset/list-schema.js';
import { inboxActionSchema } from '../actions/schema.js';

// The frozen inbox.json schemas keep their own copy of these fields, so
// changing a setting here never changes how older files decode.
export const inboxSettingsSchema = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	reasoning: StoredThinkingLevel,
	answerInstructions: z.string(),
	concurrency: z.number().int().min(1).max(4),
	mode: z.enum(['question', 'thought-dump']).optional(),
	actions: presetListSchema(inboxActionSchema),
});
