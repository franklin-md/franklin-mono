/**
 * Races a task against a deadline. On overrun, rejects with a timeout error.
 * The task is *not* actively aborted — callers that hold cancellation handles
 * must wire them in themselves. The timer is `unref`'d so it cannot keep Node
 * alive past the task.
 */
export function withDeadline<T>(
	task: Promise<T>,
	ms: number,
	label = 'Task',
): Promise<T> {
	const timer = new Promise<never>((_, reject) => {
		const handle = setTimeout(() => {
			reject(new Error(`${label} timed out after ${ms}ms`));
		}, ms);
		(handle as unknown as { unref?: () => void }).unref?.();
	});
	return Promise.race([task, timer]);
}
