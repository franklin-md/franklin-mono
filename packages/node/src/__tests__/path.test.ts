import { describe, expect, it } from 'vitest';
import type { AbsolutePath } from '@franklin/lib';
import {
	normalizeGlobEntry,
	toNativeAbsolutePath,
	toNativeResolveInput,
} from '../platform/paths.js';

describe('Node path adapters', () => {
	it('converts canonical drive paths back to native Windows paths', () => {
		expect(
			toNativeAbsolutePath('/C:/Users/afv/.franklin' as AbsolutePath, 'win32'),
		).toBe('C:\\Users\\afv\\.franklin');
	});

	it('converts canonical UNC paths back to native Windows paths', () => {
		expect(
			toNativeAbsolutePath(
				'/UNC/server/share/docs/note.md' as AbsolutePath,
				'win32',
			),
		).toBe('\\\\server\\share\\docs\\note.md');
	});

	it('converts canonical absolute inputs before Windows resolve calls', () => {
		expect(toNativeResolveInput('/C:/Users/afv' as string, 'win32')).toBe(
			'C:\\Users\\afv',
		);
	});

	it('normalizes Windows glob results to slash-separated relative paths', () => {
		expect(normalizeGlobEntry('src\\nested\\index.ts')).toBe(
			'src/nested/index.ts',
		);
	});
});
