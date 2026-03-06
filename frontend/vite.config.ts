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
			},
			'/api/generate-audit': {
				target: 'http://localhost:8083',
				changeOrigin: true
			},
			'/api/hardware': {
				target: 'http://localhost:8083',
				changeOrigin: true
			},
			'/api/health': {
				target: 'http://localhost:8083',
				changeOrigin: true
			}
		}
	}
});

