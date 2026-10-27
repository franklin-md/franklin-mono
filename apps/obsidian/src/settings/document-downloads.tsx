import { useId, useState } from 'react';
import {
	documentDownloadPolicySchema,
	type DocumentDownloadPolicy,
} from '@franklin/agent';
import { useSettings } from '@franklin/react';
import { Input, Label } from '@franklin/ui';
import { SettingControl } from '../components/obsidian-native/setting/control.js';
import { SettingDescription } from '../components/obsidian-native/setting/description.js';
import { SettingInfo } from '../components/obsidian-native/setting/info.js';
import { SettingItem } from '../components/obsidian-native/setting/item.js';
import { SettingName } from '../components/obsidian-native/setting/name.js';

type TimeoutProps = {
	field: keyof DocumentDownloadPolicy;
	label: string;
	description: string;
	unitMs: number;
};

function DownloadTimeoutSetting({
	field,
	label,
	description,
	unitMs,
}: TimeoutProps) {
	const id = useId();
	const settings = useSettings();
	const [draft, setDraft] = useState<string>();
	const [error, setError] = useState<string>();
	const value =
		draft ?? String(settings.get().documentDownloads[field] / unitMs);
	function save() {
		if (draft === undefined) return;
		const number = Number(draft);
		const result = documentDownloadPolicySchema.safeParse({
			...settings.get().documentDownloads,
			[field]: number * unitMs,
		});
		if (!Number.isInteger(number) || number <= 0 || !result.success) {
			setError('Enter a valid whole number greater than zero.');
			return;
		}
		settings.set((settings) => {
			settings.documentDownloads = result.data;
		});
		setDraft(undefined);
		setError(undefined);
	}
	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>
					<Label htmlFor={id}>{label}</Label>
				</SettingName>
				<SettingDescription>
					<span id={`${id}-description`}>{description}</span>
				</SettingDescription>
				{error && (
					<p
						id={`${id}-error`}
						role="alert"
						className="text-[var(--text-error)]"
					>
						{error}
					</p>
				)}
			</SettingInfo>
			<SettingControl>
				<Input
					id={id}
					type="number"
					min={1}
					step={1}
					className="w-24"
					value={value}
					aria-invalid={error ? true : undefined}
					aria-describedby={`${id}-description${error ? ` ${id}-error` : ''}`}
					onChange={(event) => {
						setDraft(event.target.value);
						setError(undefined);
					}}
					onBlur={save}
					onKeyDown={(event) => {
						if (event.key === 'Enter') save();
					}}
				/>
			</SettingControl>
		</SettingItem>
	);
}

export function DocumentDownloadSettings() {
	return (
		<>
			<DownloadTimeoutSetting
				field="idleTimeoutMs"
				label="Download inactivity timeout (seconds)"
				unitMs={1000}
				description="Stop if no data arrives for this long. Slow downloads can continue while data keeps arriving."
			/>
			<DownloadTimeoutSetting
				field="totalTimeoutMs"
				label="Maximum download duration (minutes)"
				unitMs={60_000}
				description="Limit the entire document download, including redirects. Changes apply to the next download in chat and the study inbox."
			/>
		</>
	);
}
