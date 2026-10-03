// backend/generateBlog.js
// Generates a blog draft with the FREE Google Gemini API,
// then creates a cover image for it with the free Pollinations image service (no key needed).
// Needs GEMINI_API_KEY in backend/.env  (get it free at https://aistudio.google.com/apikey)

const { saveImage } = require('./imageStore');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const WORDS = { short: '400-600', medium: '800-1000', long: '1200-1500' };

// Creates an image from a text description and saves it (Cloudinary or local uploads)
async function generateCoverImage(imagePrompt) {
  const fullPrompt = `${imagePrompt}, modern digital illustration, clean composition, vibrant colors, no text, no letters, no watermark`;
  const seed = Math.floor(Math.random() * 1000000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1280&height=720&nologo=true&seed=${seed}`;

  const r = await fetch(url, { signal: AbortSignal.timeout(90000) });
  const type = r.headers.get('content-type') || '';
  if (!r.ok || !type.startsWith('image/')) {
    throw new Error(`image service returned status ${r.status}`);
  }

  const ext = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : '.jpg';
  const buffer = Buffer.from(await r.arrayBuffer());
  return saveImage(buffer, ext);
}

module.exports = async (req, res) => {
  try {
    const { topic, tone = 'professional', length = 'medium', withImage = true } = req.body;

    if (!topic || topic.trim().length < 3) {
      return res.status(400).json({ error: 'Please enter a topic (at least 3 characters).' });
    }
    if (topic.length > 200) {
      return res.status(400).json({ error: 'Topic is too long (max 200 characters).' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in backend/.env' });
    }

    const prompt = `Write a blog post about: "${topic.trim()}"

Tone: ${tone}
Length of the main content: about ${WORDS[length] || WORDS.medium} words.

Rules:
- "content" must be Markdown: use ## and ### headings, short paragraphs, and bullet lists where useful.
- Do NOT repeat the title inside "content", and do NOT put the conclusion inside "content".
- "conclusion" is a separate short wrap-up of 2-3 sentences.
- "tags" are 3 to 5 short lowercase keywords without the # symbol.
- "image_prompt" is a description in English (max 40 words) of ONE visual scene that illustrates this blog. Describe objects and setting only: no text, no words, no logos, no real people.
- Be accurate. Do not invent statistics, quotes or sources.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              content: { type: 'STRING' },
              tags: { type: 'ARRAY', items: { type: 'STRING' } },
              conclusion: { type: 'STRING' },
              image_prompt: { type: 'STRING' }
            },
            required: ['title', 'content', 'tags', 'conclusion', 'image_prompt']
          },
          maxOutputTokens: 8192
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || 'AI request failed';
      if (response.status === 429) {
        return res.status(429).json({ error: 'Free AI limit reached. Please wait a minute and try again.' });
      }
      if (response.status === 400 && /api key/i.test(msg)) {
        return res.status(502).json({ error: 'Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env' });
      }
      if (response.status === 404) {
        return res.status(502).json({ error: `Model "${MODEL}" not found. Set GEMINI_MODEL in backend/.env to a current Gemini Flash model.` });
      }
      return res.status(502).json({ error: msg });
    }

    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts || []).map(p => p.text || '').join('').trim();

    if (!text) {
      const reason = data.promptFeedback?.blockReason || candidate?.finishReason || 'empty response';
      return res.status(502).json({ error: `AI returned nothing (${reason}). Try a different topic.` });
    }

    let blog;
    try {
      blog = JSON.parse(text.replace(/^```json\s*|```$/g, '').trim());
    } catch {
      return res.status(502).json({ error: 'AI response was cut off or invalid. Please try again.' });
    }

    // Create the cover image. If this fails, the blog text is still returned.
    let coverImage = '';
    let imageWarning = '';
    if (withImage) {
      try {
        const description = String(blog.image_prompt || blog.title).slice(0, 300);
        coverImage = await generateCoverImage(description);
      } catch (e) {
        imageWarning = `Blog text is ready, but the image could not be created (${e.message}). You can add one with the Image button.`;
      }
    }

    res.json({
      title: blog.title,
      content: blog.content,
      tags: Array.isArray(blog.tags) ? blog.tags : [],
      conclusion: blog.conclusion,
      coverImage,
      imageWarning
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};