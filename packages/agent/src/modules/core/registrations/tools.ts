import type { JsonValue } from '@franklin/lib';
import type {
	BaseRuntime,
	EffectValueForName,
	RegistryView,
} from '@franklin/extensibility';
import { z } from 'zod';
import type { JsonObject } from '@franklin/lib';
import type { ToolInvocation } from '../api/tool.js';
import { toToolInputSchema } from '../tools/serialize.js';

import type { MaybePromise } from '../../../utils/maybe-promise.js';
import type { CoreSignature } from '../api/api.js';
import {
	defaultToolRenderOutput,
	type RenderedToolOutput,
} from '../api/tool.js';

type RegisterToolArgs<Runtime extends BaseRuntime> = EffectValueForName<
	CoreSignature,
	Runtime,
	'registerTool'
>;

export interface BoundTool<
	TInput = unknown,
	TOutput extends JsonValue = JsonValue,
> {
	name: string;
	description: string;
	inputSchema: JsonObject;
	parse: (params: unknown) => TInput;
	run: (
		params: TInput,
		invocation?: ToolInvocation,
	) => MaybePromise<BoundToolResult<TOutput>>;
}

export type BoundToolResult<TOutput extends JsonValue = JsonValue> = {
	readonly output: TOutput;
	readonly rendered: RenderedToolOutput;
};

export function bindTools<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): BoundTool[] {
	return registrations
		.argsFor('registerTool')
		.map((registration) => normalizeTool(registration, getRuntime));
}

function normalizeTool<Runtime extends BaseRuntime>(
	registration: RegisterToolArgs<Runtime>,
	getRuntime: () => Runtime,
): BoundTool {
	const [spec, handlers] = registration;
	return {
		name: spec.name,
		description: spec.description,
		inputSchema: toToolInputSchema(spec.schema),
		parse(params) {
			const result = spec.schema.safeParse(params);
			if (!result.success)
				throw new Error(
					`Invalid arguments for tool "${spec.name}":\n${z.prettifyError(result.error)}`,
				);
			return result.data;
		},
		async run(params, invocation) {
			const runtime = getRuntime();
			const output = invocation
				? await handlers.execute(params, runtime, invocation)
				: await handlers.execute(params, runtime);
			const rendered = handlers.render
				? await handlers.render(output, params, runtime)
				: defaultToolRenderOutput(output);
			return { output, rendered };
		},
	};
}
