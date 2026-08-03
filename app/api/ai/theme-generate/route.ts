import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { z } from 'zod'

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build' })

const schema = z.object({
  prompt: z.string().min(2).max(300),
  userId: z.string().uuid(),
})

const systemPrompt = `You are a creative theme designer for a social scrapbook app.
Given a style prompt, return a JSON theme object. Return ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "name": "string (short creative theme name)",
  "palette": {
    "background": "#hex",
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "text": "#hex"
  },
  "font": "string (a real Google Font name like Inter, Playfair Display, Space Grotesk, etc.)",
  "bannerPrompt": "string (a rich image description for generating a banner, ~20 words)"
}

Rules:
- Colors must be beautiful, harmonious, and match the vibe of the prompt
- Never use pure black (#000) or pure white (#fff) for backgrounds — use rich tinted darks/lights
- The text color must be readable against the background (high contrast)
- bannerPrompt should describe a stunning, abstract, atmospheric scene — no people, no text`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid prompt', code: 'INVALID_PROMPT' },
        { status: 400 }
      )
    }

    const { prompt } = parsed.data

    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Design a theme for: "${prompt}"` },
      ],
      temperature: 0.85,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const theme = JSON.parse(raw)

    if (!theme.name || !theme.palette) {
      throw new Error('Malformed theme response')
    }

    return NextResponse.json({ theme: { ...theme, bannerUrl: null } })
  } catch (err) {
    console.error('[theme-generate]', err)
    return NextResponse.json(
      { error: 'Theme generation failed', code: 'AI_FAILURE' },
      { status: 500 }
    )
  }
}
