export function Placeholder() {
	return (
		<div className="flex flex-col gap-4 p-4 bg-background text-foreground">
			<div className="rounded-lg border-border bg-card p-4 ring-1 ring-ring">
				<p className="text-sm font-semibold text-muted-foreground">Franklin</p>
				<h2 className="text-base font-semibold text-card-foreground">
					Obsidian plugin shell
				</h2>
				<p className="text-sm text-muted-foreground">
					Styling pipeline verified — Tailwind utilities resolve to Obsidian
					theme tokens.
				</p>
			</div>

			{/* Token swatches to visually verify the mapping */}
			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium text-foreground">Token swatches</p>
				<div className="flex gap-2">
					<div className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
						primary
					</div>
					<div className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
						secondary
					</div>
					<div className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
						accent
					</div>
					<div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
						muted
					</div>
					<div className="rounded-md bg-destructive px-3 py-2 text-sm text-primary-foreground">
						destructive
					</div>
				</div>
			</div>
		</div>
	);
}
