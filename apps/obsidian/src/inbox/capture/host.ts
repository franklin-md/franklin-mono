import { mkdir, readFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { writeAtomic } from '../storage/write.js';
import type { EvidenceRepository } from './evidence/types.js';
import { captureSchema } from './schema.js';
import { episodeContext } from './context.js';
import { readMochiCards } from './mochi/read.js';
import { readMochiDraftIds } from './mochi/drafts.js';
import type { CaptureOptions } from './types.js';
import { CAPTURE_VERSION } from './version.js';

type Options = {
	appDir: string;
	vaultRoot: string;
	configDir: string;
	evidence: EvidenceRepository;
	notify: CaptureOptions['notify'];
};

export function createCaptureOptions({
	appDir,
	vaultRoot,
	configDir,
	evidence,
	notify,
}: Options): CaptureOptions {
	const path = join(appDir, 'capture.json');
	// Conservative comparison on the personal macOS build's usual case-insensitive
	// volume also rejects alternate casing of the vault configuration directory.
	const comparable = (path: string) =>
		process.platform === 'darwin' || process.platform === 'win32'
			? path.toLowerCase()
			: path;
	const inside = (root: string, path: string) => {
		const rel = relative(comparable(root), comparable(path));
		return (
			rel !== '' &&
			!rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
			rel !== '..' &&
			!isAbsolute(rel)
		);
	};
	const validateSettings: CaptureOptions['validateSettings'] = (settings) => {
		const segments = settings.collectionFolder.split('/');
		if (
			isAbsolute(settings.collectionFolder) ||
			segments.some((part) => !part.trim() || ['.', '..'].includes(part)) ||
			settings.collectionFolder.includes('\\') ||
			settings.collectionFolder.includes('\0')
		)
			throw new Error(
				'Choose a dedicated folder relative to the vault, without . or .. segments',
			);
		const folder = resolve(vaultRoot, settings.collectionFolder);
		const config = resolve(vaultRoot, configDir);
		if (
			!inside(vaultRoot, folder) ||
			comparable(folder) === comparable(config) ||
			inside(config, folder)
		)
			throw new Error(
				'The collection folder must be inside the vault and outside its configuration folder',
			);
		if (
			!isAbsolute(settings.databasePath) ||
			settings.databasePath.includes('\0')
		)
			throw new Error('Choose an absolute local Mochi database path');
	};
	return {
		defaults: {
			collectionFolder: 'Flashcard Training Examples',
			databasePath: join(
				homedir(),
				'Library/Application Support/mochi/mochi.db',
			),
		},
		evidence,
		notify,
		readCards: readMochiCards,
		readDraftIds: readMochiDraftIds,
		validateSettings,
		async load() {
			let content: string;
			try {
				content = await readFile(path, 'utf8');
			} catch (error) {
				if (
					error instanceof Error &&
					'code' in error &&
					error.code === 'ENOENT'
				)
					return undefined;
				throw error;
			}
			const document = captureSchema.parse(JSON.parse(content));
			validateSettings(document.settings);
			if (document.pending)
				validateSettings({
					collectionFolder: document.pending.folder,
					databasePath: document.pending.databasePath,
				});
			return document;
		},
		async save(document) {
			await writeAtomic(path, JSON.stringify(captureSchema.parse(document)));
		},
		async writeEpisode(episode) {
			validateSettings({
				collectionFolder: episode.folder,
				databasePath: episode.databasePath,
			});
			const root = await realpath(vaultRoot);
			const config = resolve(root, configDir);
			let directory = root;
			// Check each existing ancestor before creating children, so a vault
			// symlink cannot redirect the collection outside the vault or into config.
			for (const segment of episode.folder.split('/')) {
				directory = join(directory, segment);
				try {
					await mkdir(directory);
				} catch (error) {
					if (
						!(
							error instanceof Error &&
							'code' in error &&
							error.code === 'EEXIST'
						)
					)
						throw error;
				}
				directory = await realpath(directory);
				if (
					!inside(root, directory) ||
					comparable(directory) === comparable(config) ||
					inside(config, directory)
				)
					throw new Error(
						'Collection folder resolves outside the vault or into its configuration folder',
					);
			}
			const latest = episode.snapshots.at(-1);
			if (!latest || episode.completedAt === undefined)
				throw new Error('No completed card snapshot');
			const selected = latest.cards.filter(
				(card) => !episode.excludedCardIds.includes(card.id),
			);
			if (!selected.length) throw new Error('Empty recordings are not saved');
			const {
				error: _error,
				confirmedAt: _confirmedAt,
				confirmedEmpty: _confirmedEmpty,
				...captured
			} = episode;
			const fileName = `${episode.id}.json`;
			// One atomic replacement commits context, research, raw snapshot history
			// and captured targets together. The journal remains authoritative until
			// both this write and its completion checkpoint succeed.
			await writeAtomic(
				join(directory, fileName),
				JSON.stringify(
					{
						...captured,
						captureVersion: CAPTURE_VERSION,
						phase: 'complete',
						completionMode: 'automatic',
						context: episodeContext(episode),
						cards: selected,
						cardIds: selected.map((card) => card.id),
						candidateCardIds: latest.cards.map((card) => card.id),
						snapshotAt: latest.snapshotAt,
						snapshotStartedAt: latest.snapshotStartedAt,
						association: 'new-cards-and-saved-drafts-in-recording-window',
					},
					null,
					2,
				),
			);
			return `${episode.folder}/${fileName}`;
		},
	};
}
