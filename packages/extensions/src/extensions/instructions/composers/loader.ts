import { decode, type AbsolutePath, type Filesystem } from '@franklin/lib';

export async function loadInstruction(
	fs: Filesystem,
	file: AbsolutePath,
): Promise<LoadedInstruction | undefined> {
	if (!(await fs.exists(file))) return undefined;
	const content = await fs.readFile(file);
	return { file, content: decode(content) };
}

export async function loadInstructions(
	fs: Filesystem,
	files: AbsolutePath[],
): Promise<LoadedInstruction[]> {
	const loadTasks = files.map((file) => loadInstruction(fs, file));
	const loaded = await Promise.all(loadTasks);
	return loaded.filter((instruction) => instruction !== undefined);
}

export type LoadedInstruction = {
	readonly file: AbsolutePath;
	readonly content: string;
};
