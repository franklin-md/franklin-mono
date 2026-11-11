import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import type { DirectiveInstance } from '../../../shared/directives/instance.js';
import { DirectiveScribe } from '../../../shared/directives/scribe/operations.js';
import type {
	QuickEditRunner,
	QuickEditSettings,
	QuickEditState,
} from '../types.js';
import { quickEditError } from '../error.js';

type Options = {
	definition: DirectiveDefinition<QuickEditState>;
	run: QuickEditRunner;
	getSettings: () => QuickEditSettings;
};

export class QuickEditController {
	private active:
		| { abort: AbortController; promise: Promise<void> }
		| undefined;
	private closed = false;

	constructor(private readonly options: Options) {}

	get running(): boolean {
		return this.active !== undefined;
	}

	async restore(): Promise<void> {
		for (const instance of this.options.definition.instances())
			if (instance.state.get().status === 'running')
				await instance.update((state) => {
					state.status = 'stopped';
					state.error =
						'Interrupted by plugin reload. Review partial edits before retrying.';
				});
	}

	async execute(id: string, prompt: string): Promise<void> {
		if (this.closed) throw new Error('Quick edit is closed');
		if (this.active) throw new Error('A quick edit is already running');
		if (!prompt.trim()) return;
		const instance = this.options.definition.get(id);
		if (!instance) throw new Error('Quick edit no longer exists');
		const active = { abort: new AbortController(), promise: Promise.resolve() };
		this.active = active;
		active.promise = this.perform(
			instance,
			prompt,
			active.abort.signal,
		).finally(() => {
			this.active = undefined;
		});
		await active.promise;
	}

	stop(): void {
		this.active?.abort.abort();
	}

	async dispose(): Promise<void> {
		this.closed = true;
		this.stop();
		await this.active?.promise;
	}

	private async perform(
		instance: DirectiveInstance<QuickEditState>,
		prompt: string,
		signal: AbortSignal,
	): Promise<void> {
		const settings = structuredClone(this.options.getSettings());
		await instance.update((state) => {
			state.prompt = prompt;
			state.status = 'running';
			state.error = '';
		});
		try {
			const found = await new DirectiveScribe(instance).find();
			if (
				found.failures.length ||
				found.locations.length !== 1 ||
				found.locations[0]?.path !== instance.state.get().path
			)
				throw new Error(
					'Quick edit needs exactly one directive in its original note. Remove copied references or resolve unreadable notes, then retry.',
				);
			signal.throwIfAborted();
			await this.options.run({
				state: structuredClone(instance.state.get()),
				settings,
				signal,
			});
			signal.throwIfAborted();
			await instance.update((state) => {
				state.status = 'done';
			});
		} catch (error) {
			await instance.update((state) => {
				state.status = signal.aborted ? 'stopped' : 'failed';
				state.error = signal.aborted
					? 'Stopped. Partial edits remain in file review.'
					: quickEditError(error);
			});
		}
	}
}
