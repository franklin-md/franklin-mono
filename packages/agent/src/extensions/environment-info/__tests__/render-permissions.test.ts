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
				deniedDomains: ['localhost'],
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
				'- Bare domains match exactly; *.example.com matches strict subdomains. Allowed hosts cover all ports; IPv6 rules must be bracketed.',
				'- Domains: deniedDomains always wins; allowedDomains is deny-by-default, including when empty.',
				'- Only allowedDomains matches may be accessed, including private or loopback services explicitly named there.',
				'- allowedDomains: example.com',
				'- deniedDomains: localhost',
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
			'- Only allowedDomains matches may be accessed, including private or loopback services explicitly named there.',
		);
	});
});
