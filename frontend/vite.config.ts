import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api/vm': {
				target: 'http://localhost:8428',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/vm/, '')
			}
		}
	}
});
