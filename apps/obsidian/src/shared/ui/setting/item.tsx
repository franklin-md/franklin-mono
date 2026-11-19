import type { ReactNode } from 'react';

type Props = {
	children: ReactNode;
	layout?: 'row' | 'toggle' | 'list' | 'stacked';
};

// `mod-toggle` keeps toggles on one row when Obsidian stacks narrow settings.
// `list` centres a one-line name against icon controls, like `.mod-list`.
// `stacked` gives multi-line editors the full row width beneath their label.
const layouts = {
	row: 'setting-item',
	toggle: 'setting-item mod-toggle',
	list: 'setting-item items-center',
	stacked: 'setting-item flex-col items-stretch',
} satisfies Record<NonNullable<Props['layout']>, string>;

export function SettingItem({ children, layout = 'row' }: Props) {
	return <div className={layouts[layout]}>{children}</div>;
}
