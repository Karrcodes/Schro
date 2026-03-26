import { framer } from "framer-plugin"
import { useState, useEffect, useRef } from "react"
import "./App.css"

const STUDIO_API = "" // proxied via vite.config.ts

framer.showUI({ position: "top right", width: 320, height: 480 })

// Map Studio project status to Framer Architectural stage
const stageMap: Record<string, string> = {
  idea: "Proposal",
  research: "Concept",
  active: "In Progress",
  shipped: "Completed",
  paused: "In Progress",
  archived: "Completed"
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')                   // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '')   // remove all the accents, which happen to be all in the \u03xx range
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')             // replace spaces with -
    .replace(/[^\w-]+/g, '')          // remove all non-word chars
    .replace(/--+/g, '-')             // replace multiple - with single -
}

// Build field data for a given collection and item
function buildFieldData(fields: any[], item: any, collectionName: string, addLog: (msg: string) => void): Record<string, { type: string, value: any }> {
  const fieldData: Record<string, { type: string, value: any }> = {}
  const innerTitle = `${item.title} /`
  const safeTitle = item.title || "Untitled"

  addLog(`Collection Fields for ${collectionName}: ${JSON.stringify(fields.map((f: any) => ({ id: f.id, name: f.name, type: f.type })))}`)

  fields.forEach((f: any) => {
    const key = f.name.toLowerCase().replace(/\s+/g, "")
    
    if (key === "slug") return 
    
    let value: any = null
    if (key === "title") value = safeTitle
    else if (key === "visible") value = true
    else if (key === "innertitle") value = innerTitle
    else if (key === "bodytext") value = item.description || item.notes || item.body || ""
    else if (key === "bgimage") value = item.cover_url
    else if (key === "image1") value = item.images?.[0]
    else if (key === "image2") value = item.images?.[1]
    else if (key === "image3") value = item.images?.[2]
    else if (key === "image4") value = item.images?.[3]
    else if (key === "date") value = item.target_date || item.date_achieved || item.publish_date || item.created_at
    else if (key === "client") value = item.client
    else if (key === "location") value = item.location
    else if (key === "stage") value = stageMap[item.status] || "Proposal"
    else if (key === "showdate") value = item.show_date ?? false
    else if (key === "featuredon") value = item.organization
    else if (key === "view" || key === "medialink") value = item.url
    else if (key === "viewproject") value = item.project_url
    else if (key === "viewarticle") value = item.article_url
    else if (key === "file") value = item.file_url
    else if (key === "category") value = item.type || item.category || collectionName
    
    if (value !== null && value !== undefined) {
      // Clean up empty strings for specific types
      if (typeof value === "string" && !value.trim() && (f.type === "image" || f.type === "date" || f.type === "formattedText" || f.type === "link")) {
        return
      }
      // THE FIX: Provide an object with BOTH type and value
      fieldData[f.id] = { type: f.type, value }
    }
  })

  return fieldData
}

async function processJob(job: any, collections: any[], addLog: (msg: string) => void) {
  const collection = collections.find(c =>
    c.name.toLowerCase().replace(/\s+/g, " ").trim() ===
    job.collection_name.toLowerCase().replace(/\s+/g, " ").trim()
  )
  if (!collection) throw new Error(`Collection "${job.collection_name}" not found in Framer`)

  const fields = await collection.getFields()

  if (job.action === "hide") {
    // Find item and set Visible = false
    const items = await collection.getItems()
    const target = items.find((i: any) => i.slug === job.item_id || i.id === job.framer_cms_id)
    if (target) {
      const visibleField = fields.find((f: any) => f.name.toLowerCase() === "visible")
      if (visibleField) {
        await collection.setItemFieldValue(target.id, visibleField.id, false)
      }
    }
    return null // no framer_cms_id to return for hide
  }

  // Fetch item data from Studio
  const res = await fetch(`${STUDIO_API}/api/studio/sync`)
  const data = await res.json()

  let item: any = null
  if (job.item_type === "project") item = data.projects?.find((p: any) => p.id === job.item_id)
  else if (job.item_type === "press") item = data.press?.find((p: any) => p.id === job.item_id)
  else if (job.item_type === "content") item = data.content?.find((p: any) => p.id === job.item_id)

  if (!item) throw new Error(`Item ${job.item_id} not found in Studio`)

  const fieldData = buildFieldData(fields, item, job.collection_name, addLog)
  addLog(`Mapped Field Data: ${JSON.stringify(fieldData)}`)
  
  // Extract slug from fieldData or generate it
  const slugFieldId = Object.keys(fieldData).find(fid => fields.find((cf: any) => cf.id === fid)?.name.toLowerCase() === "slug")
  const slug = slugFieldId ? fieldData[slugFieldId].value : slugify(item.title || "item")
  const titleFieldId = Object.keys(fieldData).find(fid => fields.find((cf: any) => cf.id === fid)?.name.toLowerCase() === "title")
  const title = titleFieldId ? fieldData[titleFieldId].value : item.title // Fallback title

  addLog(`DEBUG: Slug: "${slug}", Title: "${title}"`)

  // Check if item already exists
  const existingItems = await collection.getItems()
  const existingItem = existingItems.find((i: any) => i.id === job.item_id || i.slug === slug || i.id === job.framer_cms_id)

  if (existingItem) {
    addLog(`Updating existing item: ${existingItem.id}`)
    for (const [fieldId, data] of Object.entries(fieldData)) {
      try {
        await collection.setItemFieldValue(existingItem.id, fieldId, data.value)
      } catch (err: any) {
        addLog(`Warning: Failed to set field ${fieldId}: ${err.message}`)
      }
    }
    return existingItem.id
  } else {
    addLog(`Adding new item...`)
    addLog(`Clean Field Data (Object): ${JSON.stringify(fieldData)}`)

    await collection.addItems([{
      slug,
      fieldData
    }])

    // addItems returns void, so we must find the item again to get its ID
    const updatedItems = await collection.getItems()
    const newItem = updatedItems.find((i: any) => i.slug === slug)
    
    return newItem?.id || null
  }
}

type JobStatus = { total: number; processed: number; errors: string[] }

export function App() {
  const [collections, setCollections] = useState<any[]>([])
  const [isPolling, setIsPolling] = useState(false)
  const [jobStatus, setJobStatus] = useState<JobStatus>({ total: 0, processed: 0, errors: [] })
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))

  useEffect(() => {
    framer.getCollections().then(setCollections).catch(err => addLog("Error loading collections: " + err.message))
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  const pollJobs = async () => {
    try {
      const res = await fetch(`${STUDIO_API}/api/studio/framer-jobs?status=pending`)
      if (!res.ok) return
      const jobs: any[] = await res.json()
      if (!jobs.length) return

      const allCollections = await framer.getCollections()
      addLog(`Processing ${jobs.length} pending job(s)...`)
      setJobStatus(prev => ({ ...prev, total: prev.total + jobs.length }))

      for (const job of jobs) {
        try {
          // Mark as processing
          await fetch(`${STUDIO_API}/api/studio/framer-jobs`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: job.id, status: "processing" })
          })

          const framer_cms_id = await processJob(job, allCollections, addLog)

          // Mark as done
          await fetch(`${STUDIO_API}/api/studio/framer-jobs`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: job.id, status: "done", framer_cms_id })
          })

          addLog(`✓ ${job.action === "hide" ? "Hidden" : "Published"}: ${job.collection_name} item`)
          setJobStatus(prev => ({ ...prev, processed: prev.processed + 1 }))
          setLastSync(new Date().toLocaleTimeString())
        } catch (err: any) {
          await fetch(`${STUDIO_API}/api/studio/framer-jobs`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: job.id, status: "error", error_msg: err.message })
          })
          addLog(`✗ Error: ${err.message}`)
          setJobStatus(prev => ({ ...prev, errors: [...prev.errors, err.message] }))
        }
      }
    } catch (err: any) {
      addLog("Poll error: " + err.message)
    }
  }

  const togglePolling = () => {
    if (isPolling) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = null
      setIsPolling(false)
      addLog("Stopped polling.")
    } else {
      pollJobs()
      pollingRef.current = setInterval(pollJobs, 5000)
      setIsPolling(true)
      addLog("Started polling for publish jobs...")
    }
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, fontSize: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>Studio Sync v1.1</h2>
          <p style={{ margin: 0, fontSize: 10, opacity: 0.4 }}>{collections.length} collections found</p>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: isPolling ? "#22c55e" : "#d1d5db",
          marginTop: 4
        }} title={isPolling ? "Active" : "Idle"} />
      </div>

      <button
        className={isPolling ? "framer-button-secondary" : "framer-button-primary"}
        onClick={togglePolling}
      >
        {isPolling ? "⏸ Pause Sync" : "▶ Start Sync"}
      </button>

      {lastSync && (
        <div style={{ background: "#f0fff4", color: "#22c55e", padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
          ✓ Last synced at {lastSync} — {jobStatus.processed} item(s) processed
        </div>
      )}

      {jobStatus.errors.length > 0 && (
        <div style={{ background: "#fff5f5", color: "#ef4444", padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
          {jobStatus.errors.length} error(s) — check log below
        </div>
      )}

      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 10, maxHeight: 200, overflowY: "auto", userSelect: "text" }}>
        <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", opacity: 0.4 }}>Live Log</p>
        {log.length === 0 && <p style={{ margin: 0, opacity: 0.3, fontSize: 10 }}>No activity yet. Click Start Sync.</p>}
        {log.map((entry, i) => (
          <p key={i} style={{ margin: "2px 0", fontSize: 10, opacity: 0.7 }}>{entry}</p>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 9, opacity: 0.2, textAlign: "center" }}>
        Studio must be running at http://localhost:3000
      </p>
    </main>
  )
}
