import type { z } from 'zod';
import type { evidenceSchema } from './schema.js';

export type ResearchEvidence = z.infer<typeof evidenceSchema>;
export type EvidenceRepository = {
	load(
		questionId: string,
		attemptId: string,
	): Promise<ResearchEvidence | undefined>;
	save(evidence: ResearchEvidence): Promise<void>;
};
