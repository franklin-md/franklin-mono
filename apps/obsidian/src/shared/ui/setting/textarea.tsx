import type { ComponentProps } from 'react';
import { cn, textareaClassName } from '@franklin/ui';

import { settingFieldClassName } from './field.js';

type Props = ComponentProps<'textarea'>;

export function SettingTextarea({ className, ...props }: Props) {
	return (
		<textarea
			className={cn(
				textareaClassName,
				settingFieldClassName,
				'resize-y',
				className,
			)}
			{...props}
		/>
	);
}
