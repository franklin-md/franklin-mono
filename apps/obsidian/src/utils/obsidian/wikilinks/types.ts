export interface ParsedWikilink {
	/**
	 * Obsidian link target without the surrounding `[[...]]` markers or display
	 * alias.
	 *
	 * Examples:
	 * - `[[Daily Note]]` -> `Daily Note`
	 * - `[[notes/Daily Note#Plan|today's plan]]` -> `notes/Daily Note#Plan`
	 */
	linktext: string;
	/**
	 * File lookup path extracted from the link target, with heading or block
	 * subpaths removed.
	 *
	 * Examples:
	 * - `[[Daily Note#Plan]]` -> `Daily Note`
	 * - `[[notes/Daily Note.md|today]]` -> `notes/Daily Note.md`
	 */
	linkpath: string;
	/**
	 * Text shown between the rendered `[[` and `]]` markers. Falls back to
	 * `linktext` when the wikilink has no alias or the alias is empty.
	 *
	 * Examples:
	 * - `[[Daily Note]]` -> `Daily Note`
	 * - `[[Daily Note|today]]` -> `today`
	 */
	displayText: string;
	/**
	 * Whether the file lookup path names a folder-qualified path. Bare note names
	 * need canonical-link validation because they may be ambiguous.
	 *
	 * Examples:
	 * - `[[Daily Note]]` -> `false`
	 * - `[[notes/Daily Note]]` -> `true`
	 */
	hasExplicitPath: boolean;
	/**
	 * Whether the file lookup path explicitly includes the Markdown extension.
	 * This controls how Obsidian canonicalizes a matching file link.
	 *
	 * Examples:
	 * - `[[Daily Note]]` -> `false`
	 * - `[[Daily Note.md]]` -> `true`
	 */
	hasMarkdownExtension: boolean;
}
