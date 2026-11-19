import { useId, useState } from 'react';
import { Button, Input } from '@franklin/ui';
import type { InboxActions } from '../../actions/controller.js';
import type { InboxAction } from '../../actions/types.js';
import { errorMessage } from '../../controller/error.js';
import { SettingName } from '../../../../shared/ui/setting/name.js';
import { SettingTextarea } from '../../../../shared/ui/setting/textarea.js';

type Props = {
	action: InboxAction;
	isNew?: boolean;
	controller: InboxActions;
	onDone?: () => void;
};

export function ActionEditor({
	action,
	isNew = false,
	controller,
	onDone,
}: Props) {
	const id = useId();
	const [name, setName] = useState(action.name);
	const [prompt, setPrompt] = useState(action.prompt);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();
	async function apply(operation: () => Promise<void>) {
		setPending(true);
		setError(undefined);
		try {
			await operation();
			onDone?.();
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setPending(false);
		}
	}
	return (
		<form
			className="grid gap-2"
			onSubmit={(event) => {
				event.preventDefault();
				void apply(() => controller.save({ id: action.id, name, prompt }));
			}}
		>
			<SettingName htmlFor={`${id}-name`}>Action name</SettingName>
			<Input
				id={`${id}-name`}
				value={name}
				placeholder="🃏"
				disabled={pending}
				onChange={(event) => setName(event.target.value)}
			/>
			<SettingName htmlFor={`${id}-prompt`}>Action prompt</SettingName>
			<SettingTextarea
				id={`${id}-prompt`}
				value={prompt}
				rows={5}
				disabled={pending}
				placeholder="What should this action do with the question and answer?"
				onChange={(event) => setPrompt(event.target.value)}
			/>
			<div className="flex flex-wrap gap-2">
				<Button
					type="submit"
					size="sm"
					disabled={pending || !name.trim() || !prompt.trim()}
				>
					Save action
				</Button>
				{!isNew ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={pending}
						onClick={() => {
							void apply(() => controller.remove(action.id));
						}}
					>
						Delete action
					</Button>
				) : (
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={pending}
						onClick={() => {
							void apply(() => controller.remove(action.id));
						}}
					>
						Cancel
					</Button>
				)}
			</div>
			{error && (
				<p role="alert" className="text-destructive">
					{error}
				</p>
			)}
		</form>
	);
}
