import { captureInboxSelection } from './capture.js';

export async function submitInboxSelection(options: Parameters<typeof captureInboxSelection>[0]): Promise<void> {
	const selection = captureInboxSelection(options);
	if (!selection) return;
	try {
		await selection.submit();
	} finally {
		selection.dispose();
	}
}
