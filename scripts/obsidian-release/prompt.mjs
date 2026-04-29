import { createInterface } from 'node:readline/promises';

export async function confirm(message) {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const answer = await rl.question(`${message} [y/N] `);
		return answer.trim().toLowerCase() === 'y';
	} finally {
		rl.close();
	}
}
