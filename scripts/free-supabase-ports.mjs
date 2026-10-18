import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// `supabase start` fails outright when a previous local run left containers bound to its
// ports (an unclean shutdown, a crashed terminal, a different checkout of this repo). This
// script frees ports held by *other* Supabase projects (a different checkout, an unrelated
// local Supabase project) so `npm run app:bootstrap` and `npm run db:start` are safe to rerun.
// It leaves this project's own containers running, since `supabase start` reuses a healthy
// stack instead of recreating it. If Docker itself is unreachable, it does nothing and lets
// the following Supabase command report that clearly.
//
// It only ever inspects the ports this project configures (the 553xx range), so other projects'
// stacks on their own ports (for example another project's 543xx defaults) are never touched.

const configPath = new URL('../supabase/config.toml', import.meta.url);
const config = readFileSync(configPath, 'utf8');
// Only the root local profile describes local containers; the trailing `[remotes.production]`
// override carries a hosted SMTP `port` that must never be treated as a local port to free.
const localConfig = config.split(/^\[remotes[.\]]/m)[0];
const ports = new Set([...localConfig.matchAll(/^port = (\d+)$/gm)].map(([, port]) => port));
const projectIdMatch = localConfig.match(/^project_id = "([^"]+)"$/m);

if (!projectIdMatch) {
	throw new Error(`Could not find project_id in ${configPath}`);
}

const projectId = projectIdMatch[1];

if (process.argv.includes('--print-ports')) {
	console.log(`${projectId}: ${[...ports].join(' ')}`);
	process.exit(0);
}

for (const port of ports) {
	let containers;

	try {
		containers = execFileSync(
			'docker',
			['ps', '--filter', `publish=${port}`, '--format', '{{.ID}} {{.Names}}'],
			{ encoding: 'utf8' }
		)
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const [id, name] = line.split(' ');
				return { id, name };
			});
	} catch {
		break;
	}

	const staleContainerIds = containers
		.filter(({ name }) => name?.startsWith('supabase_') && !name.endsWith(`_${projectId}`))
		.map(({ id }) => id);

	if (staleContainerIds.length > 0) {
		console.log(`Stopping containers holding port ${port}: ${staleContainerIds.join(', ')}`);
		execFileSync('docker', ['stop', ...staleContainerIds], { stdio: 'inherit' });
	}
}
