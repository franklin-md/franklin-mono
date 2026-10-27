import { useId, useState } from 'react';
import { Button, Input, Label } from '@franklin/ui';
import type { InboxActions } from '../../inbox/actions/controller.js';
import type { InboxAction } from '../../inbox/actions/types.js';
import { errorMessage } from '../../inbox/controller/error.js';

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
			className="franklin-action-editor"
			onSubmit={(event) => {
				event.preventDefault();
				void apply(() => controller.save({ id: action.id, name, prompt }));
			}}
		>
			<Label htmlFor={`${id}-name`}>Action name</Label>
			<Input
				id={`${id}-name`}
				value={name}
				placeholder="🃏"
				disabled={pending}
				onChange={(event) => setName(event.target.value)}
			/>
			<Label htmlFor={`${id}-prompt`}>Action prompt</Label>
			<textarea
				id={`${id}-prompt`}
				value={prompt}
				rows={5}
				disabled={pending}
				placeholder="What should this action do with the question and answer?"
				onChange={(event) => setPrompt(event.target.value)}
			/>
			<div className="franklin-action-editor-controls">
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
			{error && <p role="alert">{error}</p>}
		</form>
	);
}
