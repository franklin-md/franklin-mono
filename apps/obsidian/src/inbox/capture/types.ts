import type { z } from 'zod';
import type { captureSchema } from './schema.js';
import type { EvidenceRepository } from './evidence/types.js';
import type { MochiSnapshot } from './mochi/types.js';

export type CaptureDocument = z.infer<typeof captureSchema>;
export type CaptureEpisode = NonNullable<CaptureDocument['pending']>;
export type CaptureSnapshot = CaptureDocument & {
	busy: boolean;
	storageError?: string;
};
export type CaptureOptions = {
	defaults: CaptureDocument['settings'];
	evidence: EvidenceRepository;
	notify: (message: string) => void;
	load(): Promise<CaptureDocument | undefined>;
	save(document: CaptureDocument): Promise<void>;
	writeEpisode(episode: CaptureEpisode): Promise<string>;
	validateSettings(settings: CaptureDocument['settings']): void;
	readDraftIds: (path: string) => Promise<string[]>;
	readCards: (
		path: string,
		startMs: number,
		endMs: number,
		draftCardIds: string[],
	) => Promise<MochiSnapshot>;
};
