'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import type { TestimonialTone, TestimonialDraft } from '@/types/app'
import styles from './TestimonialComposer.module.css'

interface Props {
  recipientId:   string
  recipientName: string
  onDone?:       () => void
}

const TONES: { value: TestimonialTone; label: string; emoji: string }[] = [
  { value: 'heartfelt', label: 'Heartfelt', emoji: '🥰' },
  { value: 'funny',     label: 'Funny',     emoji: '😂' },
  { value: 'roast',     label: 'Roast',     emoji: '🔥' },
  { value: 'formal',    label: 'Formal',    emoji: '💼' },
]

export function TestimonialComposer({ recipientId, recipientName, onDone }: Props) {
  const supabase = createClient()
  const { user } = useAuth()

  const [content,     setContent]     = useState('')
  const [context,     setContext]     = useState('')
  const [tone,        setTone]        = useState<TestimonialTone>('heartfelt')
  const [drafts,      setDrafts]      = useState<TestimonialDraft[]>([])
  const [aiLoading,   setAiLoading]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [aiAssisted,  setAiAssisted]  = useState(false)

  const generateDrafts = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/testimonial-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          recipientName,
          context,
          tone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDrafts(data.drafts)
    } catch (err: any) {
      toast.error('AI failed to generate drafts', err?.message)
    } finally {
      setAiLoading(false)
    }
  }

  const useDraft = (text: string) => {
    setContent(text)
    setAiAssisted(true)
    setDrafts([])
  }

  const submit = async () => {
    if (!user || !content.trim()) return
    setSubmitting(true)
    try {
      const { error } = await (supabase.from('testimonials') as any).insert({
        author_id:    user.id,
        recipient_id: recipientId,
        content:      content.trim(),
        status:       'pending',
        ai_assisted:  aiAssisted,
      })
      if (error) throw error
      toast.success('Testimonial submitted! 🎉', 'It will appear once approved.')
      onDone?.()
    } catch (err: any) {
      toast.error('Failed to submit', err?.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.composer}>
      {/* Tone selector */}
      <div className={styles.toneRow}>
        <span className={styles.toneLabel}>Tone:</span>
        {TONES.map((t) => (
          <button
            key={t.value}
            className={[styles.toneBtn, tone === t.value ? styles.toneBtnActive : ''].join(' ')}
            onClick={() => setTone(t.value)}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* AI context */}
      <div className={styles.aiSection}>
        <Textarea
          id="testimonial-context"
          label="Tell the AI something about them (optional)"
          placeholder="e.g. 'we roadtripped together, she's chaotic and loyal'"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
        />
        <Button
          variant="secondary"
          size="sm"
          icon={aiLoading ? <RefreshCw size={15} className={styles.spin} /> : <Sparkles size={15} />}
          loading={aiLoading}
          onClick={generateDrafts}
        >
          Generate drafts with AI
        </Button>
      </div>

      {/* Draft picker */}
      {drafts.length > 0 && (
        <div className={styles.drafts}>
          <p className={styles.draftsTitle}>Pick a draft to edit:</p>
          {drafts.map((d) => (
            <button key={d.id} className={styles.draftCard} onClick={() => useDraft(d.text)}>
              <span className={styles.draftNum}>{d.id}</span>
              <p className={styles.draftText}>{d.text}</p>
            </button>
          ))}
        </div>
      )}

      {/* Main textarea */}
      <Textarea
        id="testimonial-content"
        label={`Your testimonial for ${recipientName}`}
        placeholder="Write something genuine, funny, or heartfelt — in your own words…"
        value={content}
        onChange={(e) => { setContent(e.target.value); if (aiAssisted) setAiAssisted(false) }}
        rows={5}
      />
      {aiAssisted && (
        <p className={styles.aiNote}>
          <Sparkles size={12} /> AI-assisted — feel free to edit before submitting
        </p>
      )}

      {/* Submit */}
      <div className={styles.footer}>
        <span className={styles.charCount}>{content.length} / 1000</span>
        <Button
          variant="primary"
          size="md"
          loading={submitting}
          disabled={content.trim().length < 10 || content.length > 1000}
          onClick={submit}
        >
          Submit Testimonial
        </Button>
      </div>
    </div>
  )
}
