import type { CSSProperties } from 'react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';

import type { BundledLanguage, HighlighterGeneric, ThemedToken } from 'shiki';
import { getSingletonHighlighter } from 'shiki';

export type CodeToken = { content: string; style: CSSProperties };
export type CodeLine = CodeToken[];

const highlighter = getSingletonHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: [],
});

function toTokens(lines: ThemedToken[][]): CodeLine[] {
	return lines.map((line) =>
		line.map((t) => ({
			content: t.content,
			style: (t.htmlStyle ?? {}) as CSSProperties,
		})),
	);
}

export function useHighlightedCode(
	code: string,
	language: string,
): CodeLine[] | null {
	const deferred = useDeferredValue(code);
	const [lines, setLines] = useState<CodeLine[] | null>(null);
	const cancelledRef = useRef(false);

	useEffect(() => {
		cancelledRef.current = false;

		void (async () => {
			const h = await highlighter;
			if (cancelledRef.current) return;

			if (!h.getLoadedLanguages().includes(language as BundledLanguage)) {
				try {
					await h.loadLanguage(language as BundledLanguage);
				} catch {
					return;
				}
			}

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated in cleanup
			if (cancelledRef.current) return;

			const result = (h as HighlighterGeneric<never, never>).codeToTokens(
				deferred,
				{
					lang: language,
					themes: { light: 'github-light', dark: 'github-dark' },
				},
			);
			setLines(toTokens(result.tokens));
		})();

		return () => {
			cancelledRef.current = true;
		};
	}, [deferred, language]);

	return lines;
}
