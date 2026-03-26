import { ElectronAuthManager } from '@franklin/electron/renderer';

let sharedAuthManager: ElectronAuthManager | null = null;
let initializePromise: Promise<ElectronAuthManager | null> | null = null;

export function getSharedAuthManager(): ElectronAuthManager | null {
	const authBridge = window.__franklinBridge.auth ?? null;
	if (!authBridge) return null;

	if (!sharedAuthManager) {
		sharedAuthManager = new ElectronAuthManager(authBridge);
	}

	return sharedAuthManager;
}

export async function initializeSharedAuthManager(): Promise<ElectronAuthManager | null> {
	const manager = getSharedAuthManager();
	if (!manager) return null;

	if (!initializePromise) {
		initializePromise = manager.initialize().then(() => manager);
	}

	return initializePromise;
}
