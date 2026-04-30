import { FileBadge, type FileBadgeProps } from '@franklin/ui';

import { parseWikilink } from '../utils/obsidian/wikilinks/parse.js';

export type ObsidianFileBadgeProps = FileBadgeProps;

function getObsidianBadgeProps(path: string): {
	path: string;
	iconExtension?: string;
} {
	const wikilink = parseWikilink(path);
	if (!wikilink) return { path };

	// TODO: Handle explicit extension here too.
	return {
		path: wikilink.linkpath,
		iconExtension: 'md',
	};
}

export function ObsidianFileBadge({
	path,
	iconExtension,
	...props
}: ObsidianFileBadgeProps) {
	const badgeProps = getObsidianBadgeProps(path);
	return (
		<FileBadge
			{...props}
			path={badgeProps.path}
			iconExtension={iconExtension ?? badgeProps.iconExtension}
		/>
	);
}
