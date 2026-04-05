'use client'

import { useState } from 'react'
import { X, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'

interface MonzoImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (count: number) => void
}

export function MonzoImportModal({ isOpen, onClose, onSuccess }: MonzoImportModalProps) {
    const [csvText, setCsvText] = useState('')
    const [wipeExisting, setWipeExisting] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { activeProfile } = useFinanceProfile()

    const handleImport = async () => {
        if (!csvText.trim()) {
            setError('Please paste your Monzo CSV content first.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/finance/monzo/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    csvText,
                    profile: activeProfile,
                    wipeExisting: wipeExisting
                })
            })

            const data = await res.json()

            if (data.success) {
                onSuccess(data.count)
                setCsvText('')
                setWipeExisting(false)
                onClose()
            } else {
                throw new Error(data.error || 'Import failed')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-white rounded-3xl border border-black/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06] bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center text-black">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-black tracking-tight">Monzo Smart-Sync</h2>
                            <p className="text-[11px] text-black/40 font-medium">Clear date errors & import CSV</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-black/[0.03] flex items-center justify-center hover:bg-black/[0.06] transition-colors">
                        <X className="w-4 h-4 text-black/40" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="bg-black/5 rounded-2xl p-5 border border-black/10">
                        <h3 className="text-[13px] font-bold text-black mb-1">How to fix date errors:</h3>
                        <ol className="text-[12px] text-black/60 space-y-1 ml-4 list-decimal marker:font-bold">
                            <li>Open the Monzo Web Interface</li>
                            <li>Go to <span className="font-bold text-black">Statement History</span> and <span className="font-bold text-black">Export to CSV</span></li>
                            <li>Open the CSV file, <span className="font-bold text-black">Copy All</span> text, and paste it below</li>
                            <li>This importer will automatically convert <span className="font-bold text-black">DD/MM/YYYY</span> to DB format.</li>
                        </ol>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase tracking-wider text-black/40 font-bold ml-1">Paste Monzo CSV Content Here</label>
                            <textarea
                                value={csvText}
                                onChange={(e) => setCsvText(e.target.value)}
                                placeholder="Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount..."
                                className="w-full h-48 bg-black/[0.02] border border-black/[0.06] rounded-2xl p-4 text-[13px] text-black font-mono placeholder:text-black/10 outline-none focus:border-black/30 transition-colors resize-none"
                            />
                        </div>

                        <label className="flex items-center gap-3 p-4 rounded-2xl border border-black/[0.06] bg-black/[0.01] cursor-pointer hover:bg-black/[0.03] transition-colors group">
                            <input
                                type="checkbox"
                                checked={wipeExisting}
                                onChange={(e) => setWipeExisting(e.target.checked)}
                                className="w-5 h-5 rounded-lg border-black/20 text-black focus:ring-black transition-all cursor-pointer"
                            />
                            <div className="flex-1">
                                <p className="text-[13px] font-bold text-black/70 group-hover:text-black transition-colors">Wipe previous Monzo data</p>
                                <p className="text-[11px] text-black/30">Delete all existing 'monzo_csv' transactions before importing.</p>
                            </div>
                        </label>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p className="text-[12px] font-medium leading-relaxed">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-[#fafafa] border-t border-black/[0.06] flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-[13px] font-bold text-black/40 hover:text-black/60 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={loading || !csvText.trim()}
                        className="flex-[2] py-4 rounded-2xl bg-black text-white text-[14px] font-bold shadow-lg shadow-black/20 hover:bg-neutral-800 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                        ) : (
                            <><CheckCircle className="w-4 h-4" /> Import Monzo Transactions</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
