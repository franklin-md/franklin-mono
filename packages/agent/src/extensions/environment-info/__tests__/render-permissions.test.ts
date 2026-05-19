import { describe, expect, it } from 'vitest';
import { renderEnvironmentPermissions } from '../render-permissions.js';

describe('renderEnvironmentPermissions', () => {
	it('explains filesystem and network permission enforcement', () => {
		const rendered = renderEnvironmentPermissions({
			filesystem: {
				allowRead: ['project/src/**'],
				denyRead: ['project/secrets/**'],
				allowWrite: ['project/**'],
				denyWrite: ['project/.git/**'],
			},
			network: {
				allowedDomains: ['example.com'],
				deniedDomains: ['localhost:9229'],
			},
		});

		expect(rendered).toBe(
			[
				'Configured environment permissions:',
				'Hosts may enforce additional stricter restrictions beyond these configured patterns.',
				'Filesystem:',
				'- Patterns are slash-separated paths relative to filesystem root.',
				'- Reads: allowed by default; denyRead blocks matches; allowRead re-allows matches.',
				'- With this config, all paths may be read except denyRead matches, with allowRead matches re-allowed.',
				'- allowRead: project/src/**',
				'- denyRead: project/secrets/**',
				'- Writes: denied by default; allowWrite allows matches; denyWrite blocks matches.',
				'- With this config, allowWrite matches may be written except denyWrite matches.',
				'- allowWrite: project/**',
				'- denyWrite: project/.git/**',
				'Network:',
				'- Patterns match domains, including subdomains, or exact host:port targets.',
				'- Loopback hosts require an explicit allow; private and link-local hosts are blocked.',
				'- Domains: deniedDomains always blocks matching URL hosts; allowedDomains limits access when non-empty.',
				'- With this config, only allowedDomains matches may be accessed, except deniedDomains matches. Loopback requires an explicit allow, and private or link-local hosts are blocked.',
				'- allowedDomains: example.com',
				'- deniedDomains: localhost:9229',
			].join('\n'),
		);
	});

	it('renders empty permission pattern lists explicitly', () => {
		const rendered = renderEnvironmentPermissions({
			filesystem: {
				allowRead: [],
				denyRead: [],
				allowWrite: [],
				denyWrite: [],
			},
			network: {
				allowedDomains: [],
				deniedDomains: [],
			},
		});

		expect(rendered).toContain('- allowRead: (none)');
		expect(rendered).toContain('- denyRead: (none)');
		expect(rendered).toContain('- allowWrite: (none)');
		expect(rendered).toContain('- denyWrite: (none)');
		expect(rendered).toContain('- allowedDomains: (none)');
		expect(rendered).toContain('- deniedDomains: (none)');
		expect(rendered).toContain('- With this config, all paths may be read.');
		expect(rendered).toContain(
			'- With this config, no paths may be written because writes are denied by default.',
		);
		expect(rendered).toContain(
			'- With this config, public hosts may be accessed. Loopback still requires an explicit allow, and private or link-local hosts are blocked.',
		);
	});
});
