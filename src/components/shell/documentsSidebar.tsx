import { desc } from 'drizzle-orm'
import { db } from '@/server/db'
import { documents } from '@/server/schema'
import { SidebarClient } from './sidebarClient'

export async function DocumentsSidebar() {
  const docs = await db
    .select({ id: documents.id, name: documents.name })
    .from(documents)
    .orderBy(desc(documents.updatedAt))

  return <SidebarClient docs={docs} />
}
