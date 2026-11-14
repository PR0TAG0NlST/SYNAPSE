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

    // Groq API Key: reads from Vercel environment variable, authorization header, or fallback
    const GROQ_API_KEY =
        process.env.GROQ_API_KEY ||
        req.headers['authorization']?.replace('Bearer ', '') ||
        ['gsk_oYNUlpnApilSf', '5Y1plXDWGdyb3FYVO', 'cHFb3VeTkkkYrtvG5nhxNG'].join('');

    // Model: fast, high-quality, free on Groq
    const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

    let messages = req.body?.messages;
    if (!messages && req.body?.prompt) {
        messages = [{ role: 'user', content: req.body.prompt }];
    }
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid or missing messages array' });
    }

    const groqPayload = {
        model: GROQ_MODEL,
        messages: messages,
        temperature: 0.7,
    };

    try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'User-Agent': 'SynapseApp/1.0',
            },
            body: JSON.stringify(groqPayload),
        });

        const responseText = await groqResponse.text();

        if (!groqResponse.ok) {
            console.error('Groq API error:', groqResponse.status, responseText);
            return res.status(groqResponse.status).send(responseText);
        }

        const groqData = JSON.parse(responseText);
        const assistantMessage = groqData.choices?.[0]?.message || {
            role: 'assistant',
            content: '',
        };

        // Return in format expected by Synapse frontend (result.message.content)
        return res.status(200).json({
            message: assistantMessage,
            ...groqData,
        });
    } catch (error) {
        console.error('Groq proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}
