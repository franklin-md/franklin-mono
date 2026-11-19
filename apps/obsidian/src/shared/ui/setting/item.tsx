import type { ReactNode } from 'react';

type Props = {
	children: ReactNode;
	layout?: 'row' | 'toggle' | 'stacked';
};

// Mirrors the DOM Obsidian's `Setting` builds, so rows get native styling.
// `setting-item` and `mod-toggle` are Obsidian's own classes from its app.css.
// `Setting.addToggle` adds `mod-toggle`, which exempts the row from the
// `@container (max-width: 340px)` rule that stacks label above control.
// `flex-col items-stretch` are Tailwind utilities: `stacked` gives multi-line
// editors the full row width beneath their label.
// Checked against Obsidian 1.12.7 app.css and app.js.
// https://docs.obsidian.md/Reference/TypeScript+API/Setting
const layouts = {
	row: 'setting-item',
	toggle: 'setting-item mod-toggle',
	stacked: 'setting-item flex-col items-stretch',
} satisfies Record<NonNullable<Props['layout']>, string>;

export function SettingItem({ children, layout = 'row' }: Props) {
	return <div className={layouts[layout]}>{children}</div>;
}
