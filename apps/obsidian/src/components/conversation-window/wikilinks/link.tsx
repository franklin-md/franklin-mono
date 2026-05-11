import type { ComponentProps } from 'react';
import { Notice } from 'obsidian';

import { useObsidianApp } from '../../obsidian-app-context.js';

import { openObsidianWikilink } from './open.js';

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
	const app = useObsidianApp();
	const target = linktext ?? dataLinktext;
	const handleClick: Props['onClick'] = (event) => {
		props.onClick?.(event);
		if (event.defaultPrevented || !app || !target) return;

		void openObsidianWikilink(app, target).catch((error: unknown) => {
			new Notice(getOpenErrorMessage(error));
		});
	};

	return (
		<button
			{...props}
			type="button"
			className="wrap-anywhere appearance-none text-left font-medium text-primary underline"
			data-obsidian-linktext={target}
			onClick={handleClick}
		>
			{children}
		</button>
	);
}

function getOpenErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	return String(error);
}
