'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Save, Eye, Download, Sparkles, Wand2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { nanoid } from 'nanoid'
import type { GeneratedTheme, ThemePalette } from '@/types/app'
import styles from './edit.module.css'

export default function EditProfilePage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user, profile, refreshProfile } = useAuth()

  const [displayName,    setDisplayName]    = useState('')
  const [username,       setUsername]       = useState('')
  const [bio,            setBio]            = useState('')
  const [visitorOptIn,   setVisitorOptIn]   = useState(false)
  const [avatarFile,     setAvatarFile]     = useState<File | null>(null)
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null)
  const [saving,         setSaving]         = useState(false)

  // Theme AI
  const [themePrompt,    setThemePrompt]    = useState('')
  const [themeLoading,   setThemeLoading]   = useState(false)
  const [generatedTheme, setGeneratedTheme] = useState<GeneratedTheme | null>(null)
  const [saveThemeLoading,setSaveThemeLoading]=useState(false)

  // Yearbook export
  const [exporting, setExporting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setUsername(profile.username)
      setBio(profile.bio ?? '')
      setVisitorOptIn(profile.visitor_log_opt_in)
    }
  }, [profile])

  const uploadAvatar = async (file: File): Promise<string> => {
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${user!.id}/${nanoid()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  const save = async () => {
    if (!user) return
    setSaving(true)
    try {
      let avatarUrl = profile?.avatar_url ?? null
      if (avatarFile) avatarUrl = await uploadAvatar(avatarFile)

      const { error } = await (supabase.from('profiles') as any)
        .update({ display_name: displayName, username, bio, avatar_url: avatarUrl, visitor_log_opt_in: visitorOptIn })
        .eq('id', user.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Profile saved!')
      router.push(`/${username}`)
    } catch (err: any) {
      toast.error('Save failed', err?.message)
    } finally {
      setSaving(false)
    }
  }

  const generateTheme = async () => {
    if (!themePrompt.trim() || !user) return
    setThemeLoading(true)
    try {
      const res  = await fetch('/api/ai/theme-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: themePrompt, userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedTheme(data.theme)
    } catch (err: any) {
      toast.error('Theme generation failed', err?.message)
    } finally {
      setThemeLoading(false)
    }
  }

  const saveTheme = async () => {
    if (!generatedTheme || !user) return
    setSaveThemeLoading(true)
    try {
      const { data: theme } = await (supabase.from('themes') as any)
        .insert({
          owner_id:   user.id,
          name:       generatedTheme.name,
          palette:    generatedTheme.palette,
          banner_url: generatedTheme.bannerUrl,
          is_public:  false,
        })
        .select()
        .single()

      if (theme) {
        await (supabase.from('profiles') as any).update({ theme_id: (theme as any).id }).eq('id', user.id)
        await refreshProfile()
        toast.success(`Theme "${(theme as any).name}" applied!`)
        setGeneratedTheme(null)
        setThemePrompt('')
      }
    } catch (err: any) {
      toast.error('Failed to save theme', err?.message)
    } finally {
      setSaveThemeLoading(false)
    }
  }

  const exportYearbook = async () => {
    if (!user) return
    setExporting(true)
    try {
      const res  = await fetch('/api/export/yearbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, format: 'pdf' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.open(data.fileUrl, '_blank')
      toast.success('Yearbook ready! 🎓', 'Link expires in 1 hour.')
    } catch (err: any) {
      toast.error('Export failed', err?.message)
    } finally {
      setExporting(false)
    }
  }

  if (!profile) return null

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Profile</h1>
          <div className={styles.headerActions}>
            <Button variant="ghost" icon={<Eye size={16} />} onClick={() => router.push(`/${username}`)}>Preview</Button>
            <Button variant="primary" icon={<Save size={16} />} loading={saving} onClick={save}>Save Changes</Button>
          </div>
        </div>

        <div className={styles.grid}>
          {/* Left: Profile form */}
          <div className={styles.mainCol}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Profile Info</h2>

              {/* Avatar */}
              <div className={styles.avatarRow}>
                <div className={styles.avatarWrap}>
                  <Avatar
                    src={avatarPreview ?? profile.avatar_url}
                    displayName={displayName || profile.display_name}
                    username={username || profile.username}
                    size="2xl"
                  />
                  <button
                    className={styles.avatarOverlay}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change avatar"
                  >
                    <Camera size={20} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
                    }}
                  />
                </div>
                <p className={styles.avatarHint}>Click to change your profile photo</p>
              </div>

              <div className={styles.formGrid}>
                <Input
                  id="edit-display-name"
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
                <Input
                  id="edit-username"
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                  placeholder="your_handle"
                  hint={`scrapbook.app/${username}`}
                />
                <div style={{ gridColumn: '1/-1' }}>
                  <Textarea
                    id="edit-bio"
                    label="Bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the world who you are…"
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* Visitor log */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Privacy</h2>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={visitorOptIn}
                  onChange={(e) => setVisitorOptIn(e.target.checked)}
                  id="visitor-opt-in"
                />
                <div className={styles.toggleTrack}>
                  <div className={styles.toggleThumb} />
                </div>
                <div>
                  <p className={styles.toggleLabel}>Show who visits my profile</p>
                  <p className={styles.toggleHint}>Both you and the visitor must have this enabled to see each other</p>
                </div>
              </label>
            </section>
          </div>

          {/* Right: Theme + Yearbook */}
          <aside className={styles.sidebar}>
            {/* AI Theme Generator */}
            <section className={styles.sideSection}>
              <div className={styles.sideSectionHeader}>
                <Wand2 size={16} className={styles.sideSectionIcon} />
                <h2 className={styles.sideSectionTitle}>AI Theme Generator</h2>
              </div>
              <div className={styles.themeForm}>
                <Input
                  id="theme-prompt"
                  placeholder="cottagecore, y2k cyberpunk, ocean sunset…"
                  value={themePrompt}
                  onChange={(e) => setThemePrompt(e.target.value)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Sparkles size={15} />}
                  loading={themeLoading}
                  onClick={generateTheme}
                  disabled={!themePrompt.trim()}
                  fullWidth
                >
                  Generate Theme
                </Button>
              </div>

              {generatedTheme && (
                <div className={styles.themePreview}>
                  <div
                    className={styles.themeSwatch}
                    style={{ background: `linear-gradient(135deg, ${generatedTheme.palette.primary}, ${generatedTheme.palette.secondary})` }}
                  >
                    <span className={styles.themePreviewName}>{generatedTheme.name}</span>
                  </div>
                  <div className={styles.paletteRow}>
                    {Object.entries(generatedTheme.palette).filter(([k]) => k !== 'font').map(([key, hex]) => (
                      <div key={key} className={styles.colorChip} style={{ background: hex as string }} title={`${key}: ${hex}`} />
                    ))}
                  </div>
                  <p className={styles.themeFont}>Font: {generatedTheme.palette.font}</p>
                  <Button variant="primary" size="sm" loading={saveThemeLoading} onClick={saveTheme} fullWidth>
                    Apply this theme
                  </Button>
                </div>
              )}
            </section>

            {/* Yearbook Export */}
            <section className={styles.sideSection}>
              <div className={styles.sideSectionHeader}>
                <Download size={16} className={styles.sideSectionIcon} />
                <h2 className={styles.sideSectionTitle}>Export Yearbook</h2>
              </div>
              <p className={styles.exportDesc}>
                Download all your scraps and approved testimonials as a PDF keepsake.
              </p>
              <Button
                variant="secondary"
                icon={<Download size={16} />}
                loading={exporting}
                onClick={exportYearbook}
                fullWidth
              >
                {exporting ? 'Generating…' : 'Download PDF'}
              </Button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
