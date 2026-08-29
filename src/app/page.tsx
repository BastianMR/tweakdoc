import { asc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/server/db'
import { documents } from '@/server/schema'
import { t } from '@/lib/i18n/en'

export default async function Home() {
  const [first] = await db
    .select({ id: documents.id })
    .from(documents)
    .orderBy(asc(documents.name))
    .limit(1)

  if (first) {
    redirect(`/documents/${first.id}`)
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">{t.sidebar.empty}</p>
    </div>
  )
}
