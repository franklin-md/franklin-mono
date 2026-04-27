import type { FranklinAPI, FranklinExtension } from '@franklin/agent/browser';
import type { SetPartOptions } from '@franklin/extensions';

// We take inspiration from: https://www.dbreunig.com/2026/04/04/how-claude-code-builds-a-system-prompt.html
const identityAndRole = `You are an expert AI agent that assists users on a variety of personal knowledge work.`;

const obsidianExplanation = `You are assisting inside an Obsidian vault.
Obsidian is a local-first Markdown knowledge base. 
Its core objects are plain-text notes, usually \`.md\` files, connected through internal links, metadata, tags, embeds, and other Obsidian-specific Markdown extensions.`;

// https://github.com/kepano/obsidian-skills/blob/main/skills/obsidian-markdown/SKILL.md
const obsidianFlavouredMarkdown = `Obsidian uses its own markdown flavour conventions. Use them when creating or editing notes:

- Use \`[[wikilinks]]\` for internal notes in the vault.
- Use standard Markdown links, \`[text](url)\`, for external URLs.
- Use YAML frontmatter for structured note metadata such as \`tags\`, \`aliases\`, \`dates\`, \`status\`, or other properties.
- Use \`#tags\` for lightweight labels and \`#nested/tags\` for hierarchy.
- Use \`![[embeds]]\` to embed notes, headings, blocks, images, PDFs, or other vault files.
- Use Obsidian callouts with \`> [!type]\` syntax for highlighted blocks when useful.
- Preserve valid Markdown and Obsidian rendering.`;

// I am least sure about this one
const obsidianUserConventionPreservation = `When editing the vault, prefer preserving and extending the user’s existing structure over imposing a new one. 
Reuse existing notes and links when possible. 
Maintain the integrity of the graph: avoid broken links, unnecessary duplicate notes, and unexplained moved content.`;

// Motivation:
// Avoid suggesting but not executing
const franklinSurface = `When the user asks for changes to vault Markdown files, make the edits directly rather than only describing them; 
the editor presents these edits as accept/reject suggestions.
Changes outside vault Markdown files are not undoable in the same way, so be more cautious and ask when unsure.`;

export const obsidianSystemPromptExtension: FranklinExtension = (api) => {
	const includePrompt = (
		prompt: string,
		api: FranklinAPI,
		opts: SetPartOptions = {},
	) => {
		api.on('systemPrompt', (systemPrompt) => {
			// Always goes first
			systemPrompt.setPart(prompt, { once: true, priority: Infinity, ...opts });
		});
	};

	includePrompt(identityAndRole, api);
	includePrompt(obsidianExplanation, api);
	includePrompt(obsidianFlavouredMarkdown, api);
	includePrompt(obsidianUserConventionPreservation, api);
	includePrompt(franklinSurface, api);
};
