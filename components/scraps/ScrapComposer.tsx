'use client'

import { useState, useRef, useCallback } from 'react'
import { Image as ImageIcon, Mic, Video, FileImage, Type, X, Send, Square } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { nanoid } from 'nanoid'
import type { ScrapType } from '@/types/database'
import styles from './ScrapComposer.module.css'

interface Props {
  recipientId: string
  onScrapSent?: () => void
}

const TABS: { type: ScrapType; label: string; icon: React.ReactNode }[] = [
  { type: 'text',  label: 'Text',  icon: <Type size={16} /> },
  { type: 'image', label: 'Image', icon: <ImageIcon size={16} /> },
  { type: 'gif',   label: 'GIF',   icon: <FileImage size={16} /> },
  { type: 'voice', label: 'Voice', icon: <Mic size={16} /> },
  { type: 'video', label: 'Video', icon: <Video size={16} /> },
]

export function ScrapComposer({ recipientId, onScrapSent }: Props) {
  const supabase = createClient()
  const { user } = useAuth()

  const [activeTab,   setActiveTab]   = useState<ScrapType>('text')
  const [text,        setText]        = useState('')
  const [mediaFile,   setMediaFile]   = useState<File | null>(null)
  const [mediaPreview,setMediaPreview]= useState<string | null>(null)
  const [gifUrl,      setGifUrl]      = useState('')
  const [recording,   setRecording]   = useState(false)
  const [audioBlob,   setAudioBlob]   = useState<Blob | null>(null)
  const [sending,     setSending]     = useState(false)
  const [dragOver,    setDragOver]    = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])

  // ---- Audio recording ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setMediaPreview(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      setRecording(true)
    } catch {
      toast.error('Microphone access denied')
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecRef.current?.stop()
    setRecording(false)
  }, [])

  // ---- File drop ----
  const handleFileDrop = useCallback((file: File) => {
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileDrop(file)
  }

  // ---- Upload helper ----
  const uploadMedia = async (file: File | Blob, ext: string): Promise<string> => {
    const path = `${user!.id}/${nanoid()}.${ext}`
    const { error } = await supabase.storage.from('scrap-media').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('scrap-media').getPublicUrl(path)
    return data.publicUrl
  }

  // ---- Send ----
  const send = async () => {
    if (!user) return
    setSending(true)
    try {
      let mediaUrl: string | null = null
      let content: string | null = text.trim() || null

      if (activeTab === 'image' && mediaFile) {
        const ext = mediaFile.name.split('.').pop() ?? 'jpg'
        mediaUrl = await uploadMedia(mediaFile, ext)
      } else if (activeTab === 'gif') {
        mediaUrl = gifUrl.trim() || null
      } else if (activeTab === 'voice' && audioBlob) {
        mediaUrl = await uploadMedia(audioBlob, 'webm')
        // Trigger async transcription
        if (mediaUrl) {
          fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaUrl, scrapId: 'pending' }),
          }).then(async (r) => {
            const { transcript } = await r.json()
            if (transcript) {
              await (supabase.from('scraps') as any).update({ transcript }).match({ author_id: user.id, media_url: mediaUrl })
            }
          })
        }
      } else if (activeTab === 'video' && mediaFile) {
        const ext = mediaFile.name.split('.').pop() ?? 'mp4'
        mediaUrl = await uploadMedia(mediaFile, ext)
      }

      const { error } = await (supabase.from('scraps') as any).insert({
        author_id:    user.id,
        recipient_id: recipientId,
        type:         activeTab,
        content,
        media_url:    mediaUrl,
      })

      if (error) throw error

      toast.success('Scrap sent! 🎉')
      setText('')
      setMediaFile(null)
      setMediaPreview(null)
      setAudioBlob(null)
      setGifUrl('')
      onScrapSent?.()
    } catch (err: any) {
      toast.error('Failed to send scrap', err?.message)
    } finally {
      setSending(false)
    }
  }

  const canSend =
    (activeTab === 'text'  && text.trim().length > 0) ||
    (activeTab === 'image' && mediaFile !== null) ||
    (activeTab === 'gif'   && gifUrl.trim().length > 0) ||
    (activeTab === 'voice' && audioBlob !== null) ||
    (activeTab === 'video' && mediaFile !== null)

  return (
    <div className={styles.composer}>
      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            role="tab"
            aria-selected={activeTab === tab.type}
            className={[styles.tab, activeTab === tab.type ? styles.tabActive : ''].join(' ')}
            onClick={() => { setActiveTab(tab.type); setMediaFile(null); setMediaPreview(null); setAudioBlob(null) }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className={styles.body}>
        {activeTab === 'text' && (
          <Textarea
            id="scrap-text"
            placeholder="Write something heartfelt, funny, or completely unhinged…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />
        )}

        {activeTab === 'image' && (
          <div
            className={[styles.dropZone, dragOver ? styles.dragOver : ''].join(' ')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {mediaPreview ? (
              <div className={styles.preview}>
                <img src={mediaPreview} alt="preview" className={styles.previewImg} />
                <button className={styles.removePreview} onClick={(e) => { e.stopPropagation(); setMediaFile(null); setMediaPreview(null) }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <ImageIcon size={32} className={styles.dropIcon} />
                <p>Drop an image or click to browse</p>
                <span className={styles.dropHint}>PNG, JPG, WEBP, GIF — max 10 MB</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileDrop(f) }}
            />
          </div>
        )}

        {activeTab === 'gif' && (
          <div className={styles.gifSection}>
            <input
              className={styles.gifInput}
              type="url"
              placeholder="Paste a GIF URL (Giphy, Tenor, etc.)"
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
            />
            {gifUrl && (
              <img src={gifUrl} alt="GIF preview" className={styles.gifPreview} onError={() => setGifUrl('')} />
            )}
          </div>
        )}

        {activeTab === 'voice' && (
          <div className={styles.voiceSection}>
            {audioBlob ? (
              <div className={styles.audioPreview}>
                <audio src={mediaPreview ?? ''} controls className={styles.audio} />
                <Button variant="ghost" size="sm" onClick={() => { setAudioBlob(null); setMediaPreview(null) }}>
                  Re-record
                </Button>
              </div>
            ) : (
              <button
                className={[styles.recordBtn, recording ? styles.recording : ''].join(' ')}
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
              >
                {recording ? (
                  <>
                    <Square size={24} className={styles.recordStop} />
                    <span>Recording… tap to stop</span>
                    <span className={styles.recordPulse} />
                  </>
                ) : (
                  <>
                    <Mic size={24} />
                    <span>Tap to record a voice scrap</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {activeTab === 'video' && (
          <div
            className={[styles.dropZone, dragOver ? styles.dragOver : ''].join(' ')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {mediaFile ? (
              <div className={styles.preview}>
                <Video size={32} className={styles.dropIcon} />
                <p className={styles.fileName}>{mediaFile.name}</p>
                <button className={styles.removePreview} onClick={(e) => { e.stopPropagation(); setMediaFile(null); setMediaPreview(null) }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <Video size={32} className={styles.dropIcon} />
                <p>Drop a video or click to browse</p>
                <span className={styles.dropHint}>MP4, WEBM — max 50 MB</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileDrop(f) }}
            />
          </div>
        )}

        {/* Caption for non-text scraps */}
        {activeTab !== 'text' && (
          <Textarea
            id="scrap-caption"
            placeholder="Add a caption (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
          />
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.charCount}>
          {text.length > 0 && `${text.length} characters`}
        </span>
        <Button
          variant="primary"
          size="md"
          icon={<Send size={16} />}
          loading={sending}
          disabled={!canSend}
          onClick={send}
        >
          Send Scrap
        </Button>
      </div>
    </div>
  )
}
