import type { ComponentProps } from 'react';

import { Favicon } from '../../../../components/favicon.js';

type Props = ComponentProps<'a'> & {
	node?: unknown;
};

export function MarkdownLink({
	children,
	href,
	node: _node,
	rel,
	target,
	...props
}: Props) {
	const hostname = getDecoratedLinkHostname(href);
	const linkTarget = hostname ? (target ?? '_blank') : undefined;
	const linkRel = hostname ? (rel ?? 'noreferrer') : undefined;

	return (
		<a
			{...props}
			href={href}
			rel={linkRel}
			target={linkTarget}
			data-streamdown="link"
		>
			{hostname && <Favicon hostname={hostname} className="mr-[0.25em]" />}
			{children}
		</a>
	);
}

function getDecoratedLinkHostname(href: Props['href']) {
	// Markdown anchors can also be relative paths, fragments, email links, or
	// streaming placeholders. Only fully qualified HTTP(S) URLs get web-link
	// decoration such as a favicon and external-tab defaults.
	if (typeof href !== 'string') return undefined;

	try {
		const url = new URL(href);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return undefined;
		}

		return url.hostname;
	} catch {
		return undefined;
	}
}
