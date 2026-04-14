import type { ComponentType } from 'react';
import { File } from 'lucide-react';

import {
	SiC,
	SiCplusplus,
	SiCss,
	SiDart,
	SiDocker,
	SiElixir,
	SiGo,
	SiGraphql,
	SiHaskell,
	SiHtml5,
	SiJavascript,
	SiJson,
	SiKotlin,
	SiLua,
	SiMarkdown,
	SiPhp,
	SiPython,
	SiReact,
	SiRuby,
	SiRust,
	SiSass,
	SiShell,
	SiSvelte,
	SiSwift,
	SiToml,
	SiTypescript,
	SiVuedotjs,
	SiYaml,
	SiZig,
} from 'react-icons/si';

import { cn } from '../lib/cn.js';

type IconComponent = ComponentType<{ className?: string }>;

export const EXT_ICONS: Record<string, IconComponent> = {
	ts: SiTypescript,
	mts: SiTypescript,
	cts: SiTypescript,
	tsx: SiReact,
	js: SiJavascript,
	mjs: SiJavascript,
	cjs: SiJavascript,
	jsx: SiReact,
	py: SiPython,
	rb: SiRuby,
	rs: SiRust,
	go: SiGo,
	c: SiC,
	h: SiC,
	cpp: SiCplusplus,
	hpp: SiCplusplus,
	swift: SiSwift,
	kt: SiKotlin,
	dart: SiDart,
	zig: SiZig,
	ex: SiElixir,
	exs: SiElixir,
	hs: SiHaskell,
	lua: SiLua,
	php: SiPhp,
	json: SiJson,
	jsonc: SiJson,
	jsonl: SiJson,
	md: SiMarkdown,
	mdx: SiMarkdown,
	html: SiHtml5,
	htm: SiHtml5,
	css: SiCss,
	scss: SiSass,
	sass: SiSass,
	less: SiCss,
	yaml: SiYaml,
	yml: SiYaml,
	toml: SiToml,
	graphql: SiGraphql,
	gql: SiGraphql,
	sh: SiShell,
	bash: SiShell,
	zsh: SiShell,
	svelte: SiSvelte,
	vue: SiVuedotjs,
	dockerfile: SiDocker,
};

export const FILENAME_ICONS: Record<string, IconComponent> = {
	dockerfile: SiDocker,
	makefile: SiShell,
};

function resolveIcon(filename: string): IconComponent {
	const lower = filename.toLowerCase();

	const filenameIcon = FILENAME_ICONS[lower];
	if (filenameIcon) return filenameIcon;

	const ext = lower.includes('.') ? lower.split('.').pop() : undefined;
	if (ext) {
		const extIcon = EXT_ICONS[ext];
		if (extIcon) return extIcon;
	}

	return File;
}

export interface FileIconProps {
	filename: string;
	className?: string;
}

export function FileIcon({ filename, className }: FileIconProps) {
	const Icon = resolveIcon(filename);
	return <Icon className={cn('shrink-0', className)} />;
}
