import { mkdtemp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { createCaptureOptions } from '../host.js';
import { createEvidenceRepository } from '../evidence/repository.js';
import { CaptureController } from '../controller.js';
import type { MochiSnapshot } from '../mochi/types.js';

export async function captureSetup() {
	const root = await mkdtemp(join(tmpdir(), 'franklin-capture-'));
	const appDir = join(root, '.obsidian/plugins/franklin');
	await mkdir(appDir, { recursive: true });
	const evidence = createEvidenceRepository(join(appDir, 'inbox-research'));
	const notify: Mock<(message: string) => void> = vi.fn();
	const options = createCaptureOptions({
		vaultRoot: root,
		appDir,
		configDir: '.obsidian',
		evidence,
		notify,
	});
	const readDraftIds = vi.spyOn(options, 'readDraftIds').mockResolvedValue([]);
	const readCards = vi
		.spyOn(options, 'readCards')
		.mockImplementation(async (source) => ({
			source,
			snapshotAt: Date.now(),
			snapshotStartedAt: Date.now(),
			cards: [],
		}));
	const capture = await CaptureController.create(options);
	return {
		root,
		appDir,
		options,
		evidence,
		readCards,
		readDraftIds,
		capture,
		notify,
	};
}

export function cardSnapshot(...ids: string[]): MochiSnapshot {
	return {
		source: '/mochi.db',
		snapshotStartedAt: Date.now(),
		snapshotAt: Date.now(),
		cards: ids.map((id) => ({
			id,
			content: `Content ${id}`,
			createdAt: 1500,
			fields: {},
			revision: 'rev-1',
			attachments: { references: [], assets: 'not-copied' },
			missing: [],
			raw: { name: id },
		})),
	};
}
