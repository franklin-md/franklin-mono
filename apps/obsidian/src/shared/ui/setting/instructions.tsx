import { useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useForm, useSelector } from '@tanstack/react-form';
import { Button } from '@franklin/ui';
import { errorMessage } from '../../error/message.js';
import { SettingDescription } from './description.js';
import { SettingError } from './error.js';
import { SettingInfo } from './info.js';
import { SettingItem } from './item.js';
import { SettingName } from './name.js';
import { SettingTextarea } from './textarea.js';

type Props = {
	// Names the textarea, such as "Answer instructions".
	label: string;
	description: ReactNode;
	value: string;
	// Offered as "Reset to default", which saves it straight away.
	resetTo?: string;
	onSave: (text: string) => Promise<void>;
};

// A draft of free-text instructions, saved on submit. A failed save keeps the
// draft and shows the error beneath it.
export function InstructionsSetting({
	label,
	description,
	value,
	resetTo,
	onSave,
}: Props) {
	const id = useId();
	const [error, setError] = useState('');
	const form = useForm({
		defaultValues: { text: value },
		onSubmit: ({ value }) => onSave(value.text),
	});
	const submitting = useSelector(form.store, (state) => state.isSubmitting);
	function submit() {
		setError('');
		// TanStack Form rethrows a failed onSubmit rather than storing it.
		void form.handleSubmit().catch((error: unknown) => {
			setError(errorMessage(error));
		});
	}
	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		submit();
	}
	function reset(text: string) {
		form.setFieldValue('text', text);
		submit();
	}
	return (
		<SettingItem layout="stacked">
			<SettingInfo>
				<SettingName htmlFor={id}>{label}</SettingName>
				<SettingDescription>{description}</SettingDescription>
			</SettingInfo>
			<form className="grid gap-2" onSubmit={onSubmit}>
				<form.Field name="text">
					{(field) => (
						<SettingTextarea
							id={id}
							rows={5}
							value={field.state.value}
							disabled={submitting}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
					)}
				</form.Field>
				<div className="flex flex-wrap gap-2">
					<Button type="submit" size="sm" disabled={submitting}>
						Save instructions
					</Button>
					{resetTo !== undefined && (
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={submitting}
							onClick={() => reset(resetTo)}
						>
							Reset to default
						</Button>
					)}
				</div>
				{error && <SettingError>{error}</SettingError>}
			</form>
		</SettingItem>
	);
}
