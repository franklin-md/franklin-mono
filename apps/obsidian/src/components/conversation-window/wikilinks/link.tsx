import type { ComponentProps } from 'react';
import { cn } from '@franklin/ui';
import { Notice } from 'obsidian';

import { useObsidianApp } from '../../obsidian-app-context.js';
import { openObsidianWikilink } from '../../../utils/obsidian/wikilinks/open.js';

type Props = ComponentProps<'button'> & {
	linktext?: string;
	node?: unknown;
};

const inlineTextButtonClassName =
	'inline cursor-pointer appearance-none border-0 bg-transparent m-0 p-0 text-inherit shadow-none [font:inherit] [line-height:inherit] [text-align:inherit]';

const resolvedWikilinkClassName =
	'[color:var(--link-color)] [font-weight:var(--link-weight)] [text-decoration:var(--link-decoration)] [text-decoration-thickness:var(--link-decoration-thickness)] hover:[color:var(--link-color-hover)] hover:[text-decoration:var(--link-decoration-hover)]';

export function ObsidianWikilink({
	children,
	className,
	linktext,
	node: _node,
	...props
}: Props) {
	const app = useObsidianApp();
	const target = linktext;
	const handleClick: Props['onClick'] = (event) => {
		props.onClick?.(event);
		if (event.defaultPrevented || !target) return;

		void openObsidianWikilink(app, target).catch((error: unknown) => {
			new Notice(getOpenErrorMessage(error));
		});
	};

	return (
		<button
			{...props}
			type="button"
			className={cn(
				inlineTextButtonClassName,
				resolvedWikilinkClassName,
				'wrap-anywhere',
				className,
			)}
			data-obsidian-linktext={target}
			onClick={handleClick}
		>
			{'[['}
			{children}
			{']]'}
		</button>
	);
}

function getOpenErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	return String(error);
}
