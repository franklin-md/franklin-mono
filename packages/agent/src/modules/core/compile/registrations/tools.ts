import type { JsonValue } from '@franklin/lib';
import type {
	BaseRuntime,
	EffectValueForName,
	RegistryView,
} from '@franklin/extensibility';
import type { z } from 'zod';

import type { MaybePromise } from '../../../../utils/maybe-promise.js';
import type { CoreSignature } from '../../api/api.js';
import {
	defaultToolRenderOutput,
	type RenderedToolOutput,
} from '../../api/tool.js';

type RegisterToolArgs<Runtime extends BaseRuntime> = EffectValueForName<
	CoreSignature,
	Runtime,
	'registerTool'
>;

export interface RegisteredTool<
	TInput = unknown,
	TOutput extends JsonValue = JsonValue,
> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	run: (params: TInput) => MaybePromise<RegisteredToolResult<TOutput>>;
}

export type RegisteredToolResult<TOutput extends JsonValue = JsonValue> = {
	readonly output: TOutput;
	readonly rendered: RenderedToolOutput;
};

export type AnyRegisteredTool = RegisteredTool;

export function registeredTools<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): AnyRegisteredTool[] {
	return registrations
		.argsFor('registerTool')
		.map((registration) => normalizeTool(registration, getRuntime));
}

function normalizeTool<Runtime extends BaseRuntime>(
	registration: RegisterToolArgs<Runtime>,
	getRuntime: () => Runtime,
): AnyRegisteredTool {
	const [spec, handlers] = registration;
	return {
		name: spec.name,
		description: spec.description,
		schema: spec.schema,
		async run(params) {
			const runtime = getRuntime();
			const output = await handlers.execute(params, runtime);
			const rendered = handlers.render
				? await handlers.render(output, params, runtime)
				: defaultToolRenderOutput(output);
			return { output, rendered };
		},
	};
}
