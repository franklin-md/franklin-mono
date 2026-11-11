import { toolSpec } from '@franklin/agent';
import { z } from 'zod';

export const finishQuickEdit = toolSpec('finish_edit', 'Report whether the requested edit succeeded after verifying the note. Call exactly once, then end the turn.', z.object({ success: z.boolean(), summary: z.string().trim().min(1) }));
