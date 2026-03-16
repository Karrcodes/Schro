'use client'

import { useRef, useState } from 'react'
import { UploadCloud, Loader2, CheckCircle, AlertCircle, X, Mail, RefreshCw } from 'lucide-react'
import { usePayslips } from '../hooks/usePayslips'
import { useIncome } from '../hooks/useIncome'
import { cn } from '@/lib/utils'

interface PayslipUploaderProps {
    onSuccess?: () => void
}

interface UploadResult {
    file: string
    status: 'ok' | 'error'
    message?: string
}

export function PayslipUploader({ onSuccess }: PayslipUploaderProps) {
    const { logPayslip } = usePayslips()
    const { logIncome } = useIncome()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [syncingGmail, setSyncingGmail] = useState(false)
    const [results, setResults] = useState<UploadResult[]>([])

    const processFiles = async (files: File[]) => {
        if (files.length === 0) return

        setUploading(true)
        setResults([])

        const newResults: UploadResult[] = []

        for (const file of files) {
            // Validate file type upfront
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
            if (!validTypes.includes(file.type)) {
                newResults.push({ file: file.name, status: 'error', message: 'Unsupported file type' })
                continue
            }

            const formData = new FormData()
            formData.append('file', file)

            try {
                const res = await fetch('/api/ai/payslip', { method: 'POST', body: formData })
                const data = await res.json()

                if (!res.ok || data.error) {
                    newResults.push({ file: file.name, status: 'error', message: data.error || 'API error' })
                    continue
                }

                if (!data.netPay || !data.date) {
                    newResults.push({ file: file.name, status: 'error', message: 'Could not extract pay/date from payslip' })
                    continue
                }

                await logPayslip({
                    date: data.date,
                    employer: data.employer || 'Salary',
                    net_pay: parseFloat(data.netPay),
                    gross_pay: data.grossPay ? parseFloat(data.grossPay) : null,
                    tax_paid: data.tax ? parseFloat(data.tax) : null,
                    pension_contributions: data.pension ? parseFloat(data.pension) : null,
                    student_loan: data.studentLoan ? parseFloat(data.studentLoan) : null,
                }, true)

                newResults.push({ file: file.name, status: 'ok', message: `£${parseFloat(data.netPay).toFixed(2)} net · ${data.date}` })
            } catch (err: any) {
                newResults.push({ file: file.name, status: 'error', message: err.message || 'Unknown error' })
            }
        }

        setUploading(false)
        setResults(newResults)
        if (fileInputRef.current) fileInputRef.current.value = ''

        const anyOk = newResults.some(r => r.status === 'ok')
        if (anyOk && onSuccess) onSuccess()
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(Array.from(e.target.files || []))
    }

    const handleSyncGmail = async () => {
        setSyncingGmail(true)
        setResults([])
        try {
            const res = await fetch('/api/cron/sync-payslips', {
                headers: { 'x-karr-manual': 'true' }
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to sync')
            
            if (data.processed > 0) {
                setResults([{ file: 'Gmail Sync', status: 'ok', message: `Successfully synced ${data.processed} payslip(s). ${data.skipped?.length > 0 ? `Skipped ${data.skipped.length} existing.` : ''}` }])
                if (onSuccess) onSuccess()
            } else {
                setResults([{ 
                    file: 'Gmail Sync', 
                    status: 'ok', 
                    message: data.skipped?.length > 0 
                        ? `Skipped ${data.skipped.length} already-logged payslip(s).` 
                        : `No new payslips. Debug: ${data.debug?.join(' | ') || 'None'}`
                }])
            }
        } catch (err: any) {
            setResults([{ file: 'Gmail Sync', status: 'error', message: err.message }])
        } finally {
            setSyncingGmail(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        processFiles(Array.from(e.dataTransfer.files))
    }

    return (
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-black/[0.03] flex items-center justify-center">
                        <UploadCloud className="w-4 h-4 text-black/40" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-bold text-black">Upload Payslips</h3>
                        <p className="text-[10px] text-black/30 font-medium tracking-tight">AI-Powered Extraction (PDF/JPG)</p>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleInputChange}
                />

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSyncGmail}
                        disabled={syncingGmail || uploading}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 shadow-sm border",
                            syncingGmail 
                                ? "bg-white border-black/[0.06] text-black/40 cursor-not-allowed" 
                                : "bg-white border-black/[0.1] text-black hover:border-black/30 hover:bg-black/[0.02] active:scale-95"
                        )}
                    >
                        {syncingGmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        Sync Gmail
                    </button>

                    <button
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        disabled={uploading || syncingGmail}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2",
                            uploading
                                ? "bg-black/[0.05] text-black/20 cursor-not-allowed"
                                : "bg-black text-white hover:bg-black/80 shadow-sm active:scale-95"
                        )}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Parsing...
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-3.5 h-3.5" />
                                Select Files
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Hidden dropzone area that wrapping the whole component might be too invasive, 
                so we'll keep a small, discreet dropzone area if they want to drag. */}
            {!uploading && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                        "h-12 flex items-center justify-center rounded-xl border border-dashed transition-all",
                        dragging
                            ? "border-black/40 bg-black/[0.02] scale-[1.01]"
                            : "border-transparent bg-transparent"
                    )}
                >
                    {dragging && <p className="text-[11px] font-bold text-black/40">Drop files to import</p>}
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-black/40 uppercase tracking-wider">Import Results</p>
                        <button onClick={() => setResults([])} className="text-[10px] text-black/25 hover:text-black/50 transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {results.map((r, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${r.status === 'ok' ? 'bg-[#059669]/5 border-[#059669]/20' : 'bg-red-50 border-red-100'}`}>
                            {r.status === 'ok'
                                ? <CheckCircle className="w-4 h-4 text-[#059669] mt-0.5 flex-shrink-0" />
                                : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-black truncate">{r.file}</p>
                                <p className={`text-[11px] mt-0.5 ${r.status === 'ok' ? 'text-[#059669]/70' : 'text-red-500'}`}>{r.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-[11px] text-black/25 italic">
                Your payslip data is processed securely and never stored externally.
            </p>
        </div>
    )
}
