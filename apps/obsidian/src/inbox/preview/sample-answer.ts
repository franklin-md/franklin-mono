export function sampleAnswer(question: string): string {
	const text = question.toLowerCase();
	let answer: string;
	if (text.includes('csr')) {
		answer =
			'Control and Status Register. A RISC-V register used to configure or inspect processor state; scause records a trap’s cause.';
	} else if (text.includes('trapframe')) {
		answer =
			'In xv6, each process has a trapframe in its own allocated page. It holds the saved user registers needed to return from the kernel.';
	} else if (
		text.includes('wake') ||
		text.includes('condition') ||
		text.includes('sleep')
	) {
		answer =
			'Waking makes a process runnable; it does not reserve the resource. Another process may change the condition before the sleeper reacquires the lock. Recheck it while holding that lock.';
	} else {
		answer =
			'Sample answer. The full version will answer this question using the selected passage and its follow-up history.';
	}
	return answer;
}
