import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	// Dedicated ports; strictPort fails loudly instead of silently moving to the next free one.
	server: { port: 5310, strictPort: true },
	preview: { port: 5310, strictPort: true },
	test: {
		include: ['src/**/*.test.ts']
	}
});
