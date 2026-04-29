import { FileBadge, type FileBadgeProps } from '@franklin/ui';

import { parseWikilink } from '../utils/obsidian/wikilinks/parse.js';

export type ObsidianFileBadgeProps = FileBadgeProps;

function getObsidianDisplayPath(path: string): string {
	return parseWikilink(path)?.linkpath ?? path;
}

export function ObsidianFileBadge({ path, ...props }: ObsidianFileBadgeProps) {
	return <FileBadge path={getObsidianDisplayPath(path)} {...props} />;
}
