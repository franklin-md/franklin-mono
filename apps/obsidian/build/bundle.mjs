import { build } from 'vite';

const isWatch = process.argv.includes('--watch');

const vaultDirArg = process.argv.find((v) => v.startsWith('--vault-dir='));
if (vaultDirArg) {
	process.env.OBSIDIAN_VAULT_DIR = vaultDirArg.slice('--vault-dir='.length);
}

const pluginDirArg = process.argv.find((v) => v.startsWith('--plugin-dir='));
if (pluginDirArg) {
	process.env.OBSIDIAN_PLUGIN_DIR = pluginDirArg.slice('--plugin-dir='.length);
}

await build({
	build: {
		watch: isWatch ? {} : null,
	},
});

if (isWatch) {
	console.log('Watching Obsidian bundle for changes');
}
