import type { MarkdownProps } from '@franklin/ui';

// A note URL is an ordinary <a href="obsidian://open?..."> in HAST. The default
// schema already allows `a` and `href`; protocols.href must also allow its scheme.
// Shared Markdown adds this scheme to its defaults, including telephone links.
// https://streamdown.ai/docs/security

export const obsidianMarkdown = {
	sanitize: { protocols: { href: ['obsidian'] } },
} satisfies Omit<MarkdownProps, 'text'>;
