import type { ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@franklin/ui';

import { settingFieldClassName } from './field.js';

type Props = ComponentProps<'select'>;

// Obsidian sets `appearance: none` on selects, so the chevron is drawn here.
export function SettingSelect({ className, ...props }: Props) {
	return (
		<span className="relative inline-flex">
			<select
				className={cn(
					settingFieldClassName,
					'h-8 pl-3 pr-8 text-start',
					className,
				)}
				{...props}
			/>
			<ChevronDown
				aria-hidden="true"
				className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
			/>
		</span>
	);
}
