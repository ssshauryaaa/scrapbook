import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { YearbookDocument } from './YearbookDocument'
import type { Profile, Scrap, Testimonial } from '@/types/database'

const schema = z.object({
  userId:    z.string().uuid(),
  format:    z.enum(['pdf', 'png']).default('pdf'),
  dateRange: z.object({
    from: z.string().nullable().optional(),
    to:   z.string().nullable().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'EXPORT_FAILED' },
        { status: 400 }
      )
    }

    const { userId, dateRange } = parsed.data
    const supabase = await createServiceClient()

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found', code: 'EXPORT_FAILED' },
        { status: 404 }
      )
    }

    // Build scraps query
    let scrapsQuery = supabase
      .from('scraps')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (dateRange?.from) scrapsQuery = scrapsQuery.gte('created_at', dateRange.from)
    if (dateRange?.to)   scrapsQuery = scrapsQuery.lte('created_at', dateRange.to)

    const { data: scrapsData } = await scrapsQuery
    const scraps = (scrapsData ?? []) as Scrap[]

    // Fetch approved testimonials
    let testimonialsQuery = supabase
      .from('testimonials')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })

    if (dateRange?.from) testimonialsQuery = testimonialsQuery.gte('created_at', dateRange.from)
    if (dateRange?.to)   testimonialsQuery = testimonialsQuery.lte('created_at', dateRange.to)

    const { data: testimonialsData } = await testimonialsQuery
    const testimonials = (testimonialsData ?? []) as Testimonial[]

    if (scraps.length === 0 && testimonials.length === 0) {
      return NextResponse.json(
        { error: 'No content to export', code: 'NO_CONTENT' },
        { status: 404 }
      )
    }

    // Render PDF — use React.createElement so this file stays as .ts
    const element = React.createElement(YearbookDocument, {
      profile: profile as Profile,
      scraps,
      testimonials,
    })

    const pdfBuffer = await renderToBuffer(element as any)

    // Upload to Supabase storage
    const filename = `${userId}/${Date.now()}-yearbook.pdf`
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    // Create signed URL (1 hour)
    const { data: signedData } = await supabase.storage
      .from('exports')
      .createSignedUrl(filename, 3600)

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()

    return NextResponse.json({
      fileUrl:   signedData?.signedUrl ?? '',
      expiresAt,
    })
  } catch (err) {
    console.error('[yearbook-export]', err)
    return NextResponse.json(
      { error: 'Export failed', code: 'EXPORT_FAILED' },
      { status: 500 }
    )
  }
}
