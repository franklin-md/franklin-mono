import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { MiniACPClient, StreamEvent } from '@franklin/mini-acp';
import type { CoreSignature } from '../../../../api/api.js';
import { bindRegisteredEventHandlers } from '../../../registrations/index.js';

export function createPromptObserver<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): (
	stream: ReturnType<MiniACPClient['prompt']>,
) => AsyncGenerator<StreamEvent> {
	const observers = {
		turnStart: bindRegisteredEventHandlers(
			registrations,
			'turnStart',
			getRuntime,
		),
		chunk: bindRegisteredEventHandlers(registrations, 'chunk', getRuntime),
		update: bindRegisteredEventHandlers(registrations, 'update', getRuntime),
		turnEnd: bindRegisteredEventHandlers(registrations, 'turnEnd', getRuntime),
	};

	return async function* observePromptStream(stream) {
		for await (const event of stream) {
			const fns = observers[event.type];
			for (const fn of fns) {
				(fn as (e: typeof event) => void)(event);
			}
			yield event;
		}
	};
}
