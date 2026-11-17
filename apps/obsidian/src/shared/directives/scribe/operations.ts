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

export class DirectiveScribe<T> {
	constructor(private readonly instance: DirectiveInstance<T>) {}

	async write(target: DirectiveWriteTarget): Promise<string> {
		this.assertAvailable();
		const { editor } = target;
		const { from, path } = target.resolve();
		const prefix =
			from.ch > 0 && !/\s$/.test(editor.getLine(from.line)) ? ' ' : '';
		const text = prefix + this.instance.text;
		const offset = editor.posToOffset(from);
		const source = editor.getValue();
		const candidate = source.slice(0, offset) + text + source.slice(offset);
		if (
			!findDirectiveRanges(candidate, this.instance).some(
				(token) => token.from === offset + prefix.length,
			)
		)
			throw new Error(
				'Cannot append an inline directive inside code or another literal Markdown region',
			);
		editor.transaction({ changes: [{ from, text }] }, 'franklin-directive');
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
		const { app } = this.instance.registry;
		const result: ReplacementResult = {
			replacements: 0,
			filesChanged: [],
			failures: [],
		};
		for (const { path } of app.vault.getMarkdownFiles()) {
			try {
				const count = await editMarkdown(app, path, (source) => {
					this.assertAvailable();
					const matches = findDirectiveRanges(source, this.instance);
					return matches.map(({ from, to }) => ({
						from,
						to,
						text: markdown,
					}));
				});
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
		if (!this.instance.registry.getRecord(this.instance.name, this.instance.id))
			throw new Error(
				'Directive registry is closed or instance is unavailable',
			);
	}
}
