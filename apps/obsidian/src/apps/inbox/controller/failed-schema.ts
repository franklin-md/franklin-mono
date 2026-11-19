import type { AgentStopCode } from '@franklin/agent';
import { z } from 'zod';

export const failedStateSchema = z.object({
	kind: z.literal('failed'),
	error: z.string(),
	// Any integer is accepted so a file written with newer stop codes still
	// loads; turn-end renderers fall back by range, category and default.
	stopCode: z
		.custom<AgentStopCode>((value) => Number.isInteger(value))
		.optional(),
});
