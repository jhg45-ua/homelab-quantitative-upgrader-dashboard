import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api/v1': {
				target: 'http://localhost:8428',
				changeOrigin: true
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

