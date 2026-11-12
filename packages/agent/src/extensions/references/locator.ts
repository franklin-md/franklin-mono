export function isFilesystemLocator(locator: string): boolean {
	return !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(locator);
}
