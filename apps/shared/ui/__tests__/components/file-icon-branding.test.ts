import { describe, expect, it } from 'vitest';
import {
	SiCss,
	SiDocker,
	SiMarkdown,
	SiReact,
	SiTypescript,
} from 'react-icons/si';
import { Archive, FileText, Music, Terminal } from 'lucide-react';

import {
	EXT_ICONS,
	FILENAME_ICONS,
} from '../../src/components/file-icon/branding.js';

const HEX_RE = /^#[0-9A-F]{6}$/i;

describe('EXT_ICONS', () => {
	it('has at least one entry', () => {
		expect(Object.keys(EXT_ICONS).length).toBeGreaterThan(0);
	});

	it('binds every entry to a defined icon component', () => {
		for (const entry of Object.values(EXT_ICONS)) {
			expect(entry.icon).toBeTruthy();
		}
	});

	it('uses lowercase keys with no leading dot', () => {
		for (const key of Object.keys(EXT_ICONS)) {
			expect(key).toBe(key.toLowerCase());
			expect(key.startsWith('.')).toBe(false);
		}
	});

	it('uses 6-digit hex codes for every brand color', () => {
		for (const entry of Object.values(EXT_ICONS)) {
			if (entry.color === undefined) continue;
			expect(entry.color).toMatch(HEX_RE);
		}
	});

	it('binds key extensions to their canonical icons', () => {
		expect(EXT_ICONS.ts?.icon).toBe(SiTypescript);
		expect(EXT_ICONS.tsx?.icon).toBe(SiReact);
		expect(EXT_ICONS.md?.icon).toBe(SiMarkdown);
		expect(EXT_ICONS.css?.icon).toBe(SiCss);
		expect(EXT_ICONS.pdf?.icon).toBe(FileText);
		expect(EXT_ICONS.mp3?.icon).toBe(Music);
		expect(EXT_ICONS['7z']?.icon).toBe(Archive);
	});
});

describe('FILENAME_ICONS', () => {
	it('uses lowercase keys with no leading dot', () => {
		for (const key of Object.keys(FILENAME_ICONS)) {
			expect(key).toBe(key.toLowerCase());
			expect(key.startsWith('.')).toBe(false);
		}
	});

	it('uses 6-digit hex codes for every brand color', () => {
		for (const entry of Object.values(FILENAME_ICONS)) {
			if (entry.color === undefined) continue;
			expect(entry.color).toMatch(HEX_RE);
		}
	});

	it('binds known whole-name files to their canonical icons', () => {
		expect(FILENAME_ICONS.dockerfile?.icon).toBe(SiDocker);
		expect(FILENAME_ICONS.makefile?.icon).toBe(Terminal);
	});
});
