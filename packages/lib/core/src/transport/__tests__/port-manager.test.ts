import { describe, expect, it } from 'vitest';

import { PortManager } from '../http/port-manager.js';

describe('PortManager', () => {
	it('allocates unique ports', async () => {
		const pm = new PortManager();
		const port1 = await pm.allocate();
		const port2 = await pm.allocate();

		expect(port1).toBeGreaterThan(0);
		expect(port2).toBeGreaterThan(0);
		expect(port1).not.toBe(port2);

		pm.release(port1);
		pm.release(port2);
	});

	it('release allows re-tracking', async () => {
		const pm = new PortManager();
		const port = await pm.allocate();
		pm.release(port);
		// Releasing again is a no-op
		pm.release(port);
	});
});
