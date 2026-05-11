import type { ComponentProps } from 'react';

type Props = ComponentProps<'button'> & {
	'data-linktext'?: string;
	dataLinktext?: string;
	node?: unknown;
};

export function ObsidianWikilink({
	children,
	'data-linktext': linktext,
	dataLinktext,
	node: _node,
	...props
}: Props) {
	const target = linktext ?? dataLinktext;

	return (
		<button
			{...props}
			type="button"
			className="wrap-anywhere appearance-none text-left font-medium text-primary underline"
			data-obsidian-linktext={target}
		>
			{children}
		</button>
	);
}
