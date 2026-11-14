export default async function handler(req, res) {
    // Set CORS headers (allows the Vercel frontend to call this endpoint)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // API key from Vercel environment variable (set in Vercel dashboard).
    // Falls back to the hardcoded key for local dev / immediate use.
    const OLLAMA_API_KEY =
        process.env.OLLAMA_API_KEY ||
        'c9ffe42a50e94760ac9cf6ba2c48be45.UWEz_FNuLY9H1OjHH08-kTw3';

    // Model selection: route retired or missing models to active glm-5.3-flash:cloud
    const body = { ...req.body };
    if (!body.model || body.model === 'gemma3:4b') {
        body.model = process.env.OLLAMA_MODEL || 'glm-5.3-flash:cloud';
    }

    try {
        const ollamaResponse = await fetch('https://ollama.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OLLAMA_API_KEY}`,
            },
            body: JSON.stringify(body),
        });

        // Read the response as text first so we can handle both JSON and error strings
        const responseText = await ollamaResponse.text();

        res.status(ollamaResponse.status);

        try {
            // Try to parse as JSON and forward
            return res.json(JSON.parse(responseText));
        } catch (_) {
            // If not JSON (e.g. plain-text error), forward as-is
            return res.send(responseText);
        }
    } catch (error) {
        console.error('Ollama proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}
