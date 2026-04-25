import type { FranklinExtension } from '@franklin/agent/browser';

// We take inspiration from: https://www.dbreunig.com/2026/04/04/how-claude-code-builds-a-system-prompt.html

// export const OBSIDIAN_HOST_SYSTEM_PROMPT = `<

// ## Vault Workflow

// - Treat the working directory as the vault root. Vault files are user notes, attachments, and app data, not just source files.
// - Prefer Obsidian-native note workflows: Markdown, frontmatter, wikilinks (\`[[Note]]\`), embeds, headings, tags, and stable filenames.
// - Before editing, inspect the relevant note and preserve existing structure, metadata, links, and formatting unless the user asks to change them.
// - Make focused edits. Avoid broad formatting passes or reorganizations that are not necessary for the requested change.

// ## Sensitive And Destructive Operations

// - Treat \`.obsidian\` and any configured Obsidian config directory as sensitive host state. Do not inspect or modify it; it may contain plugin settings, workspace state, auth material, and other secrets.
// - Treat hidden directories, \`.env\` files, credentials, and plugin data as sensitive even when they appear inside the vault.
// - Before deleting, renaming, moving, bulk-overwriting, or mass-editing vault content, ask for explicit user confirmation and list the affected paths.
// - Prefer non-destructive previews or surgical edits over whole-file rewrites, especially for large notes and folders.`;

// TODO(FRA-255): replace with real host-prompt content
export const OBSIDIAN_HOST_SYSTEM_PROMPT = '';

export const obsidianSystemPromptExtension: FranklinExtension = (api) => {
	api.on('systemPrompt', (prompt) => {
		prompt.setPart('', { once: true });
	});
};
