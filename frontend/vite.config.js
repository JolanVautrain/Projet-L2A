/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const _metaEnv = import.meta?.env ?? {};
const backendTarget = _metaEnv.BACKEND_PROXY || _metaEnv.VITE_BACKEND_PROXY || process.env.BACKEND_PROXY || process.env.VITE_BACKEND_PROXY || 'http://localhost:5000';

export default defineConfig({
	plugins: [react()],
	server: {
		host: '0.0.0.0', // CRUCIAL : écouter sur toutes les interfaces
		port: 5173,
		watch: {
			usePolling: true // Pour que le HMR marche sur volumes Docker
		},
		proxy: {
			// Redirige les appels /api vers le backend en dev.
			// Par défaut: localhost:5000. En Docker, définir BACKEND_PROXY=http://backend:5000
			'/api': {
				target: backendTarget,
				changeOrigin: true,
				secure: false,
			},
		},
	},
})
