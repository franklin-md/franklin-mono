import { inspectRuntime } from '@franklin/agent';
import { useAgent } from '@franklin/react';

import {
	CopyDumpButton,
	type CopyDumpButtonProps,
} from './copy-dump-button.js';

export type InspectDumpButtonProps = Omit<CopyDumpButtonProps, 'load'>;

export function InspectDumpButton(props: InspectDumpButtonProps) {
	const runtime = useAgent();
	return <CopyDumpButton {...props} load={() => inspectRuntime(runtime)} />;
}
