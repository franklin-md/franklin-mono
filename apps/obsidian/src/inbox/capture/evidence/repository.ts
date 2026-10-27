import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeAtomic } from '../../storage/write.js';
import { evidenceSchema } from './schema.js';
import type { EvidenceRepository } from './types.js';

export function createEvidenceRepository(
	directory: string,
): EvidenceRepository {
	const pathFor = (questionId: string, attemptId: string) =>
		join(
			directory,
			`${createHash('sha256')
				.update(JSON.stringify([questionId, attemptId]))
				.digest('hex')}.json`,
		);
	return {
		async load(questionId, attemptId) {
			let content: string;
			try {
				content = await readFile(pathFor(questionId, attemptId), 'utf8');
			} catch (error) {
				if (
					error instanceof Error &&
					'code' in error &&
					error.code === 'ENOENT'
				)
					return undefined;
				throw error;
			}
			const evidence = evidenceSchema.parse(JSON.parse(content));
			if (
				evidence.question.id !== questionId ||
				evidence.question.attemptId !== attemptId
			)
				throw new Error(
					'Research evidence identity does not match the accepted attempt',
				);
			return evidence;
		},
		async save(evidence) {
			await mkdir(directory, { recursive: true });
			await writeAtomic(
				pathFor(evidence.question.id, evidence.question.attemptId),
				JSON.stringify(evidence),
			);
		},
	};
}
