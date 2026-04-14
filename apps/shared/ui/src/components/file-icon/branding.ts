import type { ComponentType } from 'react';
import {
	Archive,
	Braces,
	FileSpreadsheet,
	FileText,
	Image,
	Music,
	Terminal,
	Video,
} from 'lucide-react';
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
	SiKotlin,
	SiLua,
	SiMarkdown,
	SiPhp,
	SiPython,
	SiReact,
	SiRuby,
	SiRust,
	SiSass,
	SiSvelte,
	SiSwift,
	SiToml,
	SiTypescript,
	SiVuedotjs,
	SiYaml,
	SiZig,
} from 'react-icons/si';

type IconComponent = ComponentType<{
	className?: string;
	color?: string;
}>;

export interface IconEntry {
	icon: IconComponent;
	color?: string;
}

// Brand colors stay separate so callers can opt into them instead of always
// overriding the surrounding text color.
export const EXT_ICONS: Record<string, IconEntry> = {
	// TypeScript / JavaScript
	ts: { icon: SiTypescript, color: '#3178C6' },
	mts: { icon: SiTypescript, color: '#3178C6' },
	cts: { icon: SiTypescript, color: '#3178C6' },
	tsx: { icon: SiReact, color: '#61DAFB' },
	js: { icon: SiJavascript, color: '#F7DF1E' },
	mjs: { icon: SiJavascript, color: '#F7DF1E' },
	cjs: { icon: SiJavascript, color: '#F7DF1E' },
	jsx: { icon: SiReact, color: '#61DAFB' },

	// Systems / compiled
	py: { icon: SiPython, color: '#3776AB' },
	rb: { icon: SiRuby, color: '#CC342D' },
	rs: { icon: SiRust, color: '#DEA584' },
	go: { icon: SiGo, color: '#00ADD8' },
	c: { icon: SiC, color: '#A8B9CC' },
	h: { icon: SiC, color: '#A8B9CC' },
	cpp: { icon: SiCplusplus, color: '#00599C' },
	hpp: { icon: SiCplusplus, color: '#00599C' },
	swift: { icon: SiSwift, color: '#F05138' },
	kt: { icon: SiKotlin, color: '#7F52FF' },
	dart: { icon: SiDart, color: '#0175C2' },
	zig: { icon: SiZig, color: '#F7A41D' },
	ex: { icon: SiElixir, color: '#4B275F' },
	exs: { icon: SiElixir, color: '#4B275F' },
	hs: { icon: SiHaskell, color: '#5D4F85' },
	lua: { icon: SiLua, color: '#2C2D72' },
	php: { icon: SiPhp, color: '#777BB4' },

	// Data / config
	json: { icon: Braces },
	jsonc: { icon: Braces },
	jsonl: { icon: Braces },
	md: { icon: SiMarkdown },
	mdx: { icon: SiMarkdown },
	yaml: { icon: SiYaml, color: '#CB171E' },
	yml: { icon: SiYaml, color: '#CB171E' },
	toml: { icon: SiToml, color: '#9C4121' },

	// Web
	html: { icon: SiHtml5, color: '#E34F26' },
	htm: { icon: SiHtml5, color: '#E34F26' },
	css: { icon: SiCss, color: '#1572B6' },
	scss: { icon: SiSass, color: '#CC6699' },
	sass: { icon: SiSass, color: '#CC6699' },
	less: { icon: SiCss, color: '#1D365D' },
	graphql: { icon: SiGraphql, color: '#E10098' },
	gql: { icon: SiGraphql, color: '#E10098' },
	svelte: { icon: SiSvelte, color: '#FF3E00' },
	vue: { icon: SiVuedotjs, color: '#4FC08D' },

	// Shell
	sh: { icon: Terminal },
	bash: { icon: Terminal },
	zsh: { icon: Terminal },

	// Docker
	dockerfile: { icon: SiDocker, color: '#2496ED' },

	// Documents
	pdf: { icon: FileText, color: '#E5252A' },
	txt: { icon: FileText },
	doc: { icon: FileText },
	docx: { icon: FileText },
	rtf: { icon: FileText },

	// Spreadsheets
	csv: { icon: FileSpreadsheet },
	xls: { icon: FileSpreadsheet },
	xlsx: { icon: FileSpreadsheet },

	// Images
	png: { icon: Image },
	jpg: { icon: Image },
	jpeg: { icon: Image },
	gif: { icon: Image },
	svg: { icon: Image },
	webp: { icon: Image },
	ico: { icon: Image },
	bmp: { icon: Image },
	avif: { icon: Image },

	// Video
	mp4: { icon: Video },
	mov: { icon: Video },
	avi: { icon: Video },
	mkv: { icon: Video },
	webm: { icon: Video },

	// Audio
	mp3: { icon: Music },
	wav: { icon: Music },
	ogg: { icon: Music },
	flac: { icon: Music },
	aac: { icon: Music },

	// Archives
	zip: { icon: Archive },
	tar: { icon: Archive },
	gz: { icon: Archive },
	rar: { icon: Archive },
	'7z': { icon: Archive },
};

export const FILENAME_ICONS: Record<string, IconEntry> = {
	dockerfile: { icon: SiDocker, color: '#2496ED' },
	makefile: { icon: Terminal },
};
