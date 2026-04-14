export interface Restorable {
	restore(): Promise<void>;
}

export async function restoreAll(...restorables: Restorable[]): Promise<void> {
	for (const r of restorables) {
		await r.restore();
	}
}
