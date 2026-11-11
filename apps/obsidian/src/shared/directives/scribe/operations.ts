import type { DirectiveInstance } from '../instance.js';
import { editMarkdown } from '../../obsidian/markdown/edit.js';
import { readMarkdown } from '../../obsidian/markdown/read.js';
import { findDirectiveRanges } from './find.js';
import { directiveFailure } from './failure.js';
import type {
	DirectiveSearchResult,
	DirectiveWriteTarget,
	ReplacementResult,
} from './types.js';
import { parseDirectives } from '../syntax/parse.js';

export class DirectiveScribe<T> {
	constructor(private readonly instance: DirectiveInstance<T>) {}

	async write(target?: DirectiveWriteTarget): Promise<string> {
		this.assertAvailable();
		const active = target
			? undefined
			: this.instance.registry.app.workspace.activeEditor;
		const editor = target?.editor ?? active?.editor;
		const location =
			target?.resolve() ??
			(active?.file && editor
				? { path: active.file.path, from: editor.getCursor() }
				: undefined);
		if (!editor || !location) throw new Error('No active Markdown editor');
		const { from, path } = location;
		const prefix =
			target && from.ch > 0 && !/\s$/.test(editor.getLine(from.line))
				? ' '
				: '';
		const text = prefix + this.instance.text;
		if (target) {
			const offset = editor.posToOffset(from);
			const source = editor.getValue();
			const candidate = source.slice(0, offset) + text + source.slice(offset);
			if (
				!parseDirectives(candidate).some(
					(token) =>
						token.id === this.instance.id &&
						token.from === offset + prefix.length,
				)
			)
				throw new Error(
					'Cannot append an inline directive inside code or another literal Markdown region',
				);
		}
		editor.transaction(
			{
				changes: [{ from, text }],
				...(target
					? {}
					: {
							selections: [
								{ from: { line: from.line, ch: from.ch + text.length } },
							],
						}),
			},
			'franklin-directive',
		);
		return path;
	}

	async find(): Promise<DirectiveSearchResult> {
		this.assertAvailable();
		const { app } = this.instance.registry;
		const result: DirectiveSearchResult = { locations: [], failures: [] };
		for (const file of app.vault.getMarkdownFiles()) {
			try {
				this.assertAvailable();
				const source = await readMarkdown(app, file.path);
				this.assertAvailable();
				for (const { from, to } of findDirectiveRanges(source, this.instance))
					result.locations.push({ path: file.path, from, to });
			} catch (error) {
				result.failures.push(directiveFailure(file.path, error));
			}
		}
		return result;
	}

	async replace(markdown: string): Promise<ReplacementResult> {
		this.assertAvailable();
		return this.replacePaths(
			this.instance.registry.app.vault
				.getMarkdownFiles()
				.map((file) => file.path),
			markdown,
		);
	}

	async replaceOne(path: string, markdown: string): Promise<ReplacementResult> {
		this.assertAvailable();
		return this.replacePaths([path], markdown, true);
	}

	private async replacePaths(
		paths: string[],
		markdown: string,
		exactlyOne = false,
	): Promise<ReplacementResult> {
		const result: ReplacementResult = {
			replacements: 0,
			filesChanged: [],
			failures: [],
		};
		for (const path of paths) {
			try {
				const count = await editMarkdown(
					this.instance.registry.app,
					path,
					(source) => {
						this.assertAvailable();
						const matches = findDirectiveRanges(source, this.instance);
						if (exactlyOne && matches.length !== 1)
							throw new Error(
								`Expected exactly one directive in ${path}; found ${matches.length}`,
							);
						return matches.map(({ from, to }) => ({
							from,
							to,
							text: markdown,
						}));
					},
				);
				if (count > 0) {
					result.replacements += count;
					result.filesChanged.push(path);
				}
			} catch (error) {
				result.failures.push(directiveFailure(path, error));
			}
		}
		return result;
	}

	private assertAvailable(): void {
		if (
			!this.instance.registry.getRenderer(this.instance.name, this.instance.id)
		)
			throw new Error(
				'Directive registry is closed or instance is unavailable',
			);
	}
}
