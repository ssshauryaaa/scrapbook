import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { z } from 'zod'

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build' })

const schema = z.object({
  recipientId:   z.string().uuid(),
  recipientName: z.string().min(1).max(100),
  context:       z.string().max(500).optional().default(''),
  tone:          z.enum(['funny', 'heartfelt', 'roast', 'formal']).default('heartfelt'),
})

const toneGuides: Record<string, string> = {
  funny:     'witty, playful, full of inside-joke energy — make them laugh',
  heartfelt: 'warm, sincere, emotionally resonant — make them feel seen',
  roast:     'affectionate roast — lovingly savage, clearly coming from friendship',
  formal:    'professional and thoughtful, like a LinkedIn recommendation but personal',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const { recipientName, context, tone } = parsed.data

    const systemPrompt = `You are a testimonial writing assistant for a social scrapbook app.
Your job is to write SHORT, PERSONAL testimonials from one friend to another.
Each testimonial should be 40-80 words, feel authentic, and avoid generic phrases.
You must return EXACTLY a JSON object with a "drafts" array containing 3 objects, each with "id" (string "1","2","3") and "text" (string).
Do not add any explanation or markdown — only the JSON.`

    const userPrompt = `Write 3 testimonial drafts for ${recipientName}.
Tone: ${tone} (${toneGuides[tone]})
Context about them: ${context || 'no extra context provided'}
Make each draft distinct — different angle, different opening, different vibe.`

    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw) as { drafts: { id: string; text: string }[] }

    if (!Array.isArray(result.drafts) || result.drafts.length === 0) {
      throw new Error('Malformed AI response')
    }

    return NextResponse.json({ drafts: result.drafts.slice(0, 3) })
  } catch (err) {
    console.error('[testimonial-draft]', err)
    return NextResponse.json(
      { error: 'AI generation failed', code: 'AI_FAILURE' },
      { status: 500 }
    )
  }
}
