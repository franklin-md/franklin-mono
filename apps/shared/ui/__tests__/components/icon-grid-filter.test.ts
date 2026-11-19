import { expect, it } from 'vitest';
import { filterIcons } from '../../src/components/icon-grid/filter.js';

const icons = [
	{ id: 'lucide-pencil', label: 'Pencil', keywords: ['edit'] },
	{ id: 'lucide-link', label: 'Link' },
	{ id: 'lucide-unlink', label: 'Unlink' },
	{ id: 'lucide-flask-conical', label: 'Flask conical' },
];

it('returns the catalog unchanged for a blank query', () => {
	expect(filterIcons(icons, '  ')).toBe(icons);
});

it('matches IDs, labels and keywords case-insensitively', () => {
	expect(filterIcons(icons, 'EDIT').map((icon) => icon.label)).toEqual([
		'Pencil',
	]);
	expect(filterIcons(icons, 'lucide-flask').map((icon) => icon.label)).toEqual([
		'Flask conical',
	]);
});

it('requires every term and ranks leading matches first', () => {
	expect(filterIcons(icons, 'link').map((icon) => icon.label)).toEqual([
		'Link',
		'Unlink',
	]);
	expect(filterIcons(icons, 'conical flask').map((icon) => icon.label)).toEqual(
		['Flask conical'],
	);
	expect(filterIcons(icons, 'flask pencil')).toEqual([]);
});
