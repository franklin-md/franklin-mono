import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { cn } from '@franklin/ui';
import type { App } from 'obsidian';
import { Notice } from 'obsidian';

import { useObsidianApp } from '../../obsidian-app-context.js';
import { getClickModifiers } from '../../../utils/obsidian/keymap.js';
import { openObsidianWikilink } from '../../../utils/obsidian/wikilinks/open.js';
import { parseWikilinkLinktext } from '../../../utils/obsidian/wikilinks/parse.js';
import { resolveWikilinkFile } from '../../../utils/obsidian/wikilinks/resolve.js';

import { getWikilinkPaneTarget } from './click-target.js';

type Props = ComponentProps<'button'> & {
	linktext?: string;
	node?: unknown;
};

// Obsidian link theme variables:
// https://docs.obsidian.md/Reference/CSS+variables/Editor/Link
const inlineTextButtonClassName =
	'inline cursor-pointer appearance-none border-0 bg-transparent m-0 p-0 text-inherit shadow-none [font:inherit] [line-height:inherit] [text-align:inherit] wrap-anywhere';

// Important is intentional: the reset above must inherit surrounding markdown
// metrics, and Tailwind's generated rule order can otherwise let those reset
// utilities win over Obsidian's link token utilities.
const resolvedWikilinkClassName =
	'![color:var(--link-color)] ![font-weight:var(--link-weight)] ![text-decoration:var(--link-decoration)] ![text-decoration-thickness:var(--link-decoration-thickness)] hover:![color:var(--link-color-hover)] hover:![text-decoration:var(--link-decoration-hover)]';

const unresolvedWikilinkClassName =
	'![color:var(--link-unresolved-color)] ![opacity:var(--link-unresolved-opacity)] ![filter:var(--link-unresolved-filter)] ![font-weight:var(--link-weight)] ![text-decoration-line:underline] ![text-decoration-style:var(--link-unresolved-decoration-style)] ![text-decoration-color:var(--link-unresolved-decoration-color)] ![text-decoration-thickness:var(--link-decoration-thickness)]';

export function ObsidianWikilink({
	children,
	className,
	linktext,
	node: _node,
	...props
}: Props) {
	const app = useObsidianApp();
	const target = linktext;
	const isResolved = useMemo(
		() => isWikilinkResolved(app, target),
		[app, target],
	);
	const wikilinkStyleClassName = isResolved
		? resolvedWikilinkClassName
		: unresolvedWikilinkClassName;
	const handleClick: Props['onClick'] = (event) => {
		props.onClick?.(event);
		if (event.defaultPrevented || !target) return;

		const newLeaf = getWikilinkPaneTarget(getClickModifiers(event.nativeEvent));
		// TODO(FRA-303): Missing note links should create the note and then open it.
		void openObsidianWikilink(app, target, { newLeaf }).catch(
			(error: unknown) => {
				new Notice(getOpenErrorMessage(error));
			},
		);
	};

	return (
		<button
			{...props}
			type="button"
			className={cn(
				inlineTextButtonClassName,
				wikilinkStyleClassName,
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

function isWikilinkResolved(app: App, linktext: string | undefined) {
	if (!linktext) return false;

	const wikilink = parseWikilinkLinktext(linktext);
	if (!wikilink) return false;

	try {
		resolveWikilinkFile(app, wikilink);
		return true;
	} catch {
		return false;
	}
}
