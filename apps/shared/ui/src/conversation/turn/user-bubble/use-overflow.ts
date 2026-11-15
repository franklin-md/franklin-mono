import { useEffect, useRef, useState } from 'react';

export function useContentOverflow(text: string) {
	const [canExpand, setCanExpand] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const content = contentRef.current;
		const markdown = content?.firstElementChild;
		if (!content || !markdown) return;

		const measure = () => {
			const previewHeight =
				parseFloat(getComputedStyle(content).lineHeight) * 3;
			setCanExpand(markdown.getBoundingClientRect().height > previewHeight);
		};

		measure();
		if (typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver(measure);
		// Measure the full Markdown independently of the animated viewport so
		// opening/closing cannot temporarily hide the toggle.
		observer.observe(markdown);
		return () => observer.disconnect();
	}, [text]);

	return { canExpand, contentRef };
}
