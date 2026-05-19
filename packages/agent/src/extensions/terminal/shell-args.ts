import type { ShellFamily } from '@franklin/lib';

export function shellArgs(family: ShellFamily, cmd: string): string[] {
	switch (family) {
		case 'posix':
			// Non-login (`-c`, not `-lc`): a login shell sources /etc/profile and
			// ~/.profile, which the sandbox's allowRead denies — producing
			// "Operation not permitted" noise on stderr. PATH/HOME are already
			// inherited via the merged env, and tool execution shouldn't depend
			// on user-specific shell aliases. Mirrors powershell's -NoProfile.
			return ['-c', cmd];
		case 'fish':
			return ['-c', cmd];
		case 'powershell':
			return ['-NoProfile', '-Command', cmd];
		case 'cmd':
			return ['/d', '/s', '/c', cmd];
	}
}
