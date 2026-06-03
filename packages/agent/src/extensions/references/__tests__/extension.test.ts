import { describe, expect, it, vi } from 'vitest';
import { createMockMiniACP, finishedTurn } from '@franklin/mini-acp/mock';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	createFolderScopedFilesystem,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import {
	buildStateExtensionModule,
	createCoreStateModule,
	createEnvironmentModule,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '../../../modules/index.js';
import { createRuntime } from '../../../testing/index.js';
import { createReferencesModule } from '../../../modules/references/module.js';
import {
	filesystemFileReferenceExtension,
	textDocumentReferenceExtension,
} from '../index.js';

const defaultConfig: EnvironmentConfig = {
	fsConfig: {
		cwd: '/project' as AbsolutePath,
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

function createEnvironment(filesystem: Filesystem): ReconfigurableEnvironment {
	return {
		filesystem,
		process: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => defaultConfig),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

async function createReferenceRuntime(
	filesystem: Filesystem = new MemoryFilesystem(),
) {
	const module = buildStateExtensionModule([
		createCoreStateModule(
			createMockMiniACP({ defaultTurn: finishedTurn() }).connector,
		),
		createReferencesModule(),
		createEnvironmentModule(async () => createEnvironment(filesystem)),
	]);
	const runtime = await createRuntime(
		module,
		{ ...module.emptyState(), env: defaultConfig },
		[filesystemFileReferenceExtension, textDocumentReferenceExtension],
	);
	return { runtime, filesystem };
}

describe('built-in reference extensions', () => {
	it('materializes filesystem text files through text', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.txt' as AbsolutePath, 'from disk');
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			locator: '/project/note.txt',
			label: 'Disk note',
		});

		expect(context.content).toEqual({
			type: 'text',
			text: 'Reference: Disk note\n\nfrom disk',
		});
	});

	it('allows untyped file references to enter the filesystem provider chain', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.txt' as AbsolutePath, 'from disk');
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			locator: '/project/note.txt',
			label: 'Disk note',
		});

		expect(context.content).toEqual({
			type: 'text',
			text: 'Reference: Disk note\n\nfrom disk',
		});
	});

	it('keeps the original locator when delegating filesystem data', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.txt' as AbsolutePath, 'from scoped disk');
		const { runtime } = await createReferenceRuntime(
			createFolderScopedFilesystem('/project' as AbsolutePath, filesystem),
		);

		const context = await runtime.references.toContext({
			locator: 'note.txt',
		});

		expect(context.content).toEqual({
			type: 'text',
			text: 'Reference: note.txt\n\nfrom scoped disk',
		});
	});

	it('returns unavailable content for directories', async () => {
		const filesystem = new MemoryFilesystem();
		await filesystem.mkdir('/project/notes' as AbsolutePath);
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			locator: '/project/notes',
		});

		expect(context.content).toEqual({
			type: 'text',
			text: 'Reference unavailable: Reference path is not a file: /project/notes',
		});
		expect(context.isError).toBe(true);
	});
});
