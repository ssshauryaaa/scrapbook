import Link from 'next/link'
import { BookOpen, Sparkles, Users, Star, Send, Mic } from 'lucide-react'
import styles from './home.module.css'

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* Animated background */}
      <div className={styles.bg}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
        <div className={styles.grid} />
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <BookOpen size={24} />
          <span>Scrapbook</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/login"  className={styles.navLink}>Sign In</Link>
          <Link href="/signup" className={styles.navCta}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <Sparkles size={14} />
          <span>Your digital memory wall</span>
        </div>
        <h1 className={styles.heroTitle}>
          Send scraps.<br />
          Collect memories.<br />
          <span className={styles.heroAccent}>Stay connected.</span>
        </h1>
        <p className={styles.heroSub}>
          A nostalgic-meets-modern social platform where friends leave scraps on your wall,
          write real testimonials, and share moments that last forever.
        </p>
        <div className={styles.heroActions}>
          <Link href="/signup" className={styles.ctaPrimary}>
            Create Your Wall
          </Link>
          <Link href="/login" className={styles.ctaSecondary}>
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        {[
          {
            icon: <Send size={24} />,
            title: 'Scraps',
            desc: 'Send text, images, GIFs, voice notes, and videos to friends\' walls.',
            color: '#38bdf8',
          },
          {
            icon: <Star size={24} />,
            title: 'Testimonials',
            desc: 'Write heartfelt (or roast-worthy) testimonials with AI-assist. Approve before publishing.',
            color: '#c084fc',
          },
          {
            icon: <Sparkles size={24} />,
            title: 'AI Themes',
            desc: 'Generate a unique profile theme from a single text prompt. Cottagecore to cyberpunk.',
            color: '#fb923c',
          },
          {
            icon: <Mic size={24} />,
            title: 'Voice & Video',
            desc: 'Record voice scraps directly in the browser. Auto-transcribed with Whisper AI.',
            color: '#4ade80',
          },
          {
            icon: <Users size={24} />,
            title: 'Communities',
            desc: 'Create and join themed communities. Post, connect, and vibe together.',
            color: '#f472b6',
          },
          {
            icon: <BookOpen size={24} />,
            title: 'Yearbook Export',
            desc: 'Compile your scraps and testimonials into a downloadable PDF yearbook.',
            color: '#fbbf24',
          },
        ].map((f, i) => (
          <div key={i} className={styles.featureCard} style={{ '--feature-color': f.color } as React.CSSProperties}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaBannerTitle}>Ready to start your memory wall?</h2>
        <Link href="/signup" className={styles.ctaPrimary}>Create Your Account — It&apos;s Free</Link>
      </section>

      <footer className={styles.footer}>
        <p>Made with ♥ by Scrapbook</p>
      </footer>
    </div>
  )
}
