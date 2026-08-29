'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface SheetColumn {
  id: string
  name: string
}

export interface SheetRow {
  id: string
  num: number
  values: Record<string, string>
}

export interface Sheet {
  columns: SheetColumn[]
  rows: SheetRow[]
}

interface DatasetState {
  datasetId: string | null
  sheet: Sheet
  nextRowNumber: number
  loading: boolean
}

export function useDataset(datasetId: string | null) {
  const [state, setState] = useState<DatasetState>({
    datasetId,
    sheet: { columns: [], rows: [] },
    nextRowNumber: 1,
    loading: !!datasetId,
  })
  const nextRowRef = useRef(1)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reload = useCallback(async () => {
    if (!datasetId) return
    const res = await fetch(`/api/datasets/${datasetId}`)
    if (!res.ok) return
    const body = await res.json()
    nextRowRef.current = body.nextRowNumber
    setState({
      datasetId,
      sheet: body.sheet,
      nextRowNumber: body.nextRowNumber,
      loading: false,
    })
  }, [datasetId])

  useEffect(() => {
    void reload()
  }, [reload])

  const saveSheet = useCallback(
    (sheet: Sheet) => {
      if (!datasetId) return
      setState((s) => ({ ...s, sheet }))
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const res = await fetch(`/api/datasets/${datasetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheet, expectedNextRowNumber: nextRowRef.current }),
        })
        if (res.status === 409) {
          const body = await res.json()
          nextRowRef.current = body.currentNextRowNumber
          toast.warning('Table changed elsewhere — reloading latest data.')
          await reload()
        }
      }, 500)
    },
    [datasetId, reload],
  )

  const setNextRowNumber = useCallback((n: number) => {
    nextRowRef.current = n
    setState((s) => ({ ...s, nextRowNumber: n }))
  }, [])

  return { ...state, reload, saveSheet, setNextRowNumber }
}
