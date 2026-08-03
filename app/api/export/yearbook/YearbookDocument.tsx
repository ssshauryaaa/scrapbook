import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import type { Profile, Scrap, Testimonial } from '@/types/database'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#0d0d0f',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2e',
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    color: '#c084fc',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#f4f4f5',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrapCard: {
    backgroundColor: '#141417',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#c084fc',
  },
  scrapMeta: {
    fontSize: 9,
    color: '#71717a',
    marginBottom: 4,
  },
  scrapContent: {
    fontSize: 11,
    color: '#f4f4f5',
    lineHeight: 1.5,
  },
  testimonialCard: {
    backgroundColor: '#141417',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  testimonialContent: {
    fontSize: 11,
    color: '#f4f4f5',
    lineHeight: 1.5,
  },
  testimonialAuthor: {
    fontSize: 9,
    color: '#a1a1aa',
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#3f3f46',
    textAlign: 'center',
  },
})

interface YearbookDocumentProps {
  profile: Profile
  scraps: Scrap[]
  testimonials: Testimonial[]
}

export function YearbookDocument({ profile, scraps, testimonials }: YearbookDocumentProps) {
  const ownerName = profile.display_name ?? profile.username

  return (
    <Document title={`${ownerName}'s Scrapbook Yearbook`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{ownerName}&apos;s Yearbook</Text>
          <Text style={styles.subtitle}>
            Generated on {format(new Date(), 'MMMM d, yyyy')} · Scrapbook
          </Text>
        </View>

        {/* Scraps Section */}
        {scraps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scraps Received ({scraps.length})</Text>
            {scraps.slice(0, 20).map((scrap) => (
              <View key={scrap.id} style={styles.scrapCard}>
                <Text style={styles.scrapMeta}>
                  {scrap.type.toUpperCase()} · {format(new Date(scrap.created_at), 'MMM d, yyyy')}
                </Text>
                {scrap.content ? (
                  <Text style={styles.scrapContent}>{scrap.content}</Text>
                ) : null}
                {scrap.transcript ? (
                  <Text style={styles.scrapContent}>[Transcript] {scrap.transcript}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Testimonials Section */}
        {testimonials.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Testimonials ({testimonials.length})</Text>
            {testimonials.map((t) => (
              <View key={t.id} style={styles.testimonialCard}>
                <Text style={styles.testimonialContent}>&ldquo;{t.content}&rdquo;</Text>
                <Text style={styles.testimonialAuthor}>
                  Approved {t.approved_at ? format(new Date(t.approved_at), 'MMM d, yyyy') : ''}
                  {t.ai_assisted ? ' · AI-assisted' : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>Made with heart on Scrapbook</Text>
      </Page>
    </Document>
  )
}
