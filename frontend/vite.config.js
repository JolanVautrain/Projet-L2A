import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
plugins: [react()],
server: {
		host: '0.0.0.0', // CRUCIAL : écouter sur toutes les interfaces
		port: 5173,
		watch: {
			usePolling: true // Pour que le HMR marche sur volumes Docker
		},
		proxy: {
			// Redirige les appels /api vers le backend Flask en dev (nom du service Docker)
			'/api': {
				target: 'http://backend:5000',
				changeOrigin: true,
				secure: false,
			},
		},
	},
})
