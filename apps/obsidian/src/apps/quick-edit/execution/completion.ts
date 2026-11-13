import { toolSpec } from '@franklin/agent';
import { z } from 'zod';

export const finishQuickEdit = toolSpec(
	'finish_edit',
	"Report whether the requested edit succeeded after verifying the note. success: true explicitly requests application deletion of this request's active directive and cleanup of its request-only row or bullet while preserving prose, outline children and pending content differences. Leave exactly one active directive in the originating note for that cleanup. success: false retains the request and your summary as its recovery explanation; it does not imply a runtime crash. Call exactly once, then end the turn. Successful requests cannot be reopened; later edits are new requests.",
	z.object({ success: z.boolean(), summary: z.string().trim().min(1) }),
);
