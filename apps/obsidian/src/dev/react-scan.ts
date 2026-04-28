export async function registerReactScan(): Promise<void> {
	if (process.env.NODE_ENV !== 'development') {
		return;
	}

	const { scan } = await import('react-scan');
	scan({
		enabled: true,
		showToolbar: true,
	});
}
