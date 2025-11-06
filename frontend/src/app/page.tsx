'use client'

import { useEffect, useMemo, useState } from 'react'

type Failure = { externalId?: string; link?: string; reason?: string }
type ImportLog = {
  _id: string
  sourceUrl: string
  timestamp: string
  totalFetched: number
  totalImported: number
  newJobs: number
  updatedJobs: number
  failedJobs: number
  failures?: Failure[]
}

export default function HomePage() {
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<'timestamp' | 'failedJobs' | 'newJobs' | 'updatedJobs'>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterUrl, setFilterUrl] = useState('')
  const [onlyFailed, setOnlyFailed] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000', [])

  async function load(currentPage = page) {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
        ...(filterUrl ? { sourceUrl: filterUrl } : {}),
        ...(onlyFailed ? { hasFailures: 'true' } : {})
      })
      const res = await fetch(`${apiBase}/api/logs?${qs.toString()}`)
      const json = await res.json()
      setLogs(json.items || [])
      setTotal(json.total || 0)
      setPage(json.page || 1)
    } finally {
      setLoading(false)
    }
  }

  async function triggerImport() {
    setTriggering(true)
    try {
      await fetch(`${apiBase}/api/import/trigger`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(urlInput ? { url: urlInput } : {}) })
      await load(1)
    } finally {
      setTriggering(false)
    }
  }

  useEffect(() => {
    load(1)
    // Live updates via SSE
    const ev = new EventSource(`${apiBase}/api/logs/stream`)
    ev.onmessage = () => {
      // get fresh first page on any new event
      load(1)
    }
    return () => { ev.close() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase])

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Import History</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-sm text-slate-500">Manual feed URL</label>
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/feed.xml" className="border rounded px-3 py-2 w-80" />
        </div>
        <button onClick={triggerImport} disabled={triggering} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {triggering ? 'Enqueuing…' : 'Trigger Import'}
        </button>
        <div className="flex flex-col">
          <label className="text-sm text-slate-500">Filter by URL</label>
          <input value={filterUrl} onChange={(e) => setFilterUrl(e.target.value)} placeholder="jobicy.com" className="border rounded px-3 py-2 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <input id="failedOnly" type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
          <label htmlFor="failedOnly" className="text-sm">Only failures</label>
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border rounded px-2 py-2">
            <option value="timestamp">Sort: Date</option>
            <option value="failedJobs">Sort: Failed</option>
            <option value="newJobs">Sort: New</option>
            <option value="updatedJobs">Sort: Updated</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="border rounded px-2 py-2">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <button onClick={() => load(1)} className="border px-3 py-2 rounded">Apply</button>
        </div>
      </div>

      <div className="bg-white border rounded shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3">File/URL</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">New</th>
                <th className="p-3 text-right">Updated</th>
                <th className="p-3 text-right">Failed</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td className="p-3" colSpan={7}>Loading…</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td className="p-3" colSpan={7}>No data.</td></tr>
              )}
              {!loading && logs.map((l) => (
                <>
                  <tr key={l._id} className="border-t">
                    <td className="p-3 align-top">{l.sourceUrl}</td>
                    <td className="p-3 align-top">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="p-3 align-top text-right">{l.totalImported}</td>
                    <td className="p-3 align-top text-right">{l.newJobs}</td>
                    <td className="p-3 align-top text-right">{l.updatedJobs}</td>
                    <td className={"p-3 align-top text-right " + (l.failedJobs ? 'text-red-600 font-medium' : '')}>{l.failedJobs}</td>
                    <td className="p-3 align-top">
                      <button className="text-blue-600" onClick={() => toggleExpand(l._id)}>
                        {expanded[l._id] ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expanded[l._id] && (
                    <tr>
                      <td className="p-3 bg-slate-50" colSpan={7}>
                        {l.failures && l.failures.length ? (
                          <ul className="list-disc pl-6 space-y-1">
                            {l.failures.map((f, i) => (
                              <li key={i} className="text-sm">
                                <span className="text-slate-600">{f.externalId || f.link || 'N/A'}:</span> {f.reason}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-slate-500">No failures recorded.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-3 border-t bg-slate-50">
          <div className="text-sm">Page {page} of {totalPages} • {total} rows</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => load(page - 1)} className="border px-3 py-1 rounded disabled:opacity-50">Prev</button>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="border px-3 py-1 rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}


