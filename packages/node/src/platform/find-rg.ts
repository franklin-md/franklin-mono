import { type OsInfo, type AbsolutePath, toAbsolutePath } from '@franklin/lib';
import { access } from 'node:fs/promises';

const MAC_HOMEBREW = '/opt/homebrew/bin/';
const MAC_MANUAL = '/usr/local/bin/';
const LINUX = '/usr/bin/';

export async function findRgPath(osInfo: OsInfo): Promise<AbsolutePath | null> {
	const platform = await osInfo.getPlatform();
	if (platform == 'mac' || platform == 'linux') {
		try {
			await access(MAC_HOMEBREW + 'rg');
			return toAbsolutePath(MAC_HOMEBREW);
		} catch {
			try {
				await access(MAC_MANUAL + 'rg');
				return toAbsolutePath(MAC_MANUAL);
			} catch {
				try {
					await access(LINUX + 'rg');
					return toAbsolutePath(LINUX);
				} catch {
					return null;
				}
			}
		}
	} else {
		// platform is windows
		// TODO: we could run standard `grep` to get `rg.exe` from somewhere
		// but there's no point at the moment because the SRT does not support
		// windows anyway.
		return null;
	}
}
