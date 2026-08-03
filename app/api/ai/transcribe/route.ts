import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { z } from 'zod'

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build' })

const schema = z.object({
  mediaUrl: z.string().url(),
  scrapId:  z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'TRANSCRIBE_FAILED' },
        { status: 400 }
      )
    }

    const { mediaUrl } = parsed.data

    // Fetch the media file from Supabase storage
    const mediaRes = await fetch(mediaUrl)
    if (!mediaRes.ok) {
      return NextResponse.json(
        { error: 'Could not fetch media file', code: 'TRANSCRIBE_FAILED' },
        { status: 400 }
      )
    }

    const contentType = mediaRes.headers.get('content-type') ?? 'audio/webm'
    const supportedTypes = [
      'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav',
      'audio/ogg', 'video/mp4', 'video/webm',
    ]

    if (!supportedTypes.some((t) => contentType.startsWith(t.split('/')[0]))) {
      return NextResponse.json(
        { error: 'Unsupported media format', code: 'UNSUPPORTED_FORMAT' },
        { status: 400 }
      )
    }

    const blob = await mediaRes.blob()

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
    }
    const ext = extMap[contentType] ?? 'webm'
    const file = new File([blob], `scrap.${ext}`, { type: contentType })

    const groq = getGroq()
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
    })

    return NextResponse.json({
      transcript:      transcription.text,
      durationSeconds: (transcription as { duration?: number }).duration ?? 0,
    })
  } catch (err) {
    console.error('[transcribe]', err)
    return NextResponse.json(
      { error: 'Transcription failed', code: 'TRANSCRIBE_FAILED' },
      { status: 500 }
    )
  }
}
