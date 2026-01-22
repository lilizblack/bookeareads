import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Get port from environment variable or default to 8080
const PORT = process.env.PORT || 8080;

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

import fs from 'fs/promises';

// Handle client-side routing - inject env vars into index.html
app.get('*', async (req, res) => {
    try {
        const indexPath = join(__dirname, 'dist', 'index.html');
        let html = await fs.readFile(indexPath, 'utf-8');

        // Inject environment variables
        const envScript = `
        <script>
            window.env = {
                VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || ''}",
                VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || ''}"
            };
        </script>
        `;

        html = html.replace('<!--ENV_VARS-->', envScript);
        res.send(html);
    } catch (error) {
        console.error('Error reading index.html:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start server on 0.0.0.0 to accept external connections (required for Cloud Run)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
