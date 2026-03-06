'use client'
import { useState, useEffect } from 'react'
import { X, ExternalLink, Check, Copy, Share2, ClipboardCheck, BookOpen, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PublishModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    htmlContent: string
}

export function PublishModal({ isOpen, onClose, title, htmlContent }: PublishModalProps) {
    const [step, setStep] = useState<'idle' | 'copying' | 'copied'>('idle')
    const [copiedTitle, setCopiedTitle] = useState(false)

    if (!isOpen) return null

    const handleCopyTitle = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            // Priority 1: Modern API (Secure only)
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(title)
            } else {
                throw new Error('Insecure context')
            }
            setCopiedTitle(true)
            setTimeout(() => setCopiedTitle(false), 2000)
        } catch (err) {
            // Priority 2: Traditional execCommand (Fallback for iPad/Insecure IP)
            try {
                const textArea = document.createElement("textarea")
                textArea.value = title
                textArea.style.position = "fixed"
                textArea.style.left = "-9999px"
                textArea.style.top = "0"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
                setCopiedTitle(true)
                setTimeout(() => setCopiedTitle(false), 2000)
            } catch (fallbackErr) {
                console.error('Final copy fallback failed:', fallbackErr)
            }
        }
    }

    const handlePublishToSubstack = async () => {
        setStep('copying')
        try {
            // Priority 1: Modern ClipboardItem API (for Rich Text)
            if (window.isSecureContext && typeof ClipboardItem !== 'undefined') {
                const type = 'text/html'
                const blob = new Blob([htmlContent], { type })
                const data = [new ClipboardItem({ [type]: blob, 'text/plain': new Blob([htmlContent], { type: 'text/plain' }) })]
                await navigator.clipboard.write(data)
            } else {
                throw new Error('ClipboardItem not available')
            }

            setStep('copied')
            setTimeout(() => {
                // For iPad, opening a new tab immediately after clipboard write can sometimes fail the paste.
                // Substack's publish page is also different on iPad.
                // We'll just open the main Substack page for now.
                const userAgent = navigator.userAgent.toLowerCase();
                const isIPad = /ipad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

                if (isIPad) {
                    window.open('https://substack.com/', '_blank');
                } else {
                    window.open('https://substack.com/publish', '_blank');
                }
            }, 800)
        } catch (err) {
            console.error('Failed to copy rich text:', err)

            try {
                // Priority 2: Hidden Div selection (Rich Text Fallback)
                // This copies the actual rendered HTML as rich text, avoiding raw <p> tags
                const div = document.createElement('div');
                div.innerHTML = htmlContent;
                div.style.position = 'fixed';
                div.style.left = '-9999px';
                div.style.top = '0';
                document.body.appendChild(div);

                const range = document.createRange();
                range.selectNode(div);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                    document.execCommand('copy');
                    selection.removeAllRanges();
                }
                document.body.removeChild(div);

                setStep('copied')
                // For iPad, opening a new tab immediately after clipboard write can sometimes fail the paste.
                // Substack's publish page is also different on iPad.
                // We'll just open the main Substack page for now.
                const userAgent = navigator.userAgent.toLowerCase();
                const isIPad = /ipad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

                if (isIPad) {
                    window.open('https://substack.com/', '_blank');
                } else {
                    window.open('https://substack.com/publish', '_blank');
                }
            } catch (fallbackErr) {
                console.error('Final fallback failed:', fallbackErr)
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-black tracking-tight">Ready to Publish?</h2>
                        <p className="text-[13px] text-black/40 font-medium mt-1">Select your destination and we'll handle the prep.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 rounded-full text-black/20 hover:text-black transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 pt-4 space-y-6">
                    {/* Substack Card */}
                    <div className="bg-[#FF6719]/[0.03] border border-[#FF6719]/10 rounded-[32px] p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6719]/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:scale-110" />

                        <div className="flex items-start gap-4 relative z-10">
                            <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shadow-lg shadow-[#FF6719]/10 border border-[#FF6719]/10">
                                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#FF6719]">
                                    <path d="M22.539 8.242H1.46V5.405h21.079v2.837zM1.46 10.812V24l10.539-6.035L22.537 24V10.812H1.46zM22.539 0H1.46v2.838h21.079V0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[18px] font-black text-black">Substack</h3>
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">Recommended</span>
                                </div>
                                <p className="text-[12px] text-black/50 font-medium leading-relaxed mt-1 pr-12">
                                    We'll copy your article as high-quality Rich Text. Just paste into the Substack composer and you're done.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3 relative z-10">
                            <button
                                onClick={handlePublishToSubstack}
                                disabled={step !== 'idle'}
                                className={cn(
                                    "w-full py-4.5 rounded-[22px] font-black uppercase text-[12px] tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] h-[56px]",
                                    step === 'idle' ? "bg-[#FF6719] text-white hover:bg-[#e65a15] shadow-[#FF6719]/30" : "bg-emerald-500 text-white shadow-emerald-500/30"
                                )}
                            >
                                {step === 'idle' ? (
                                    <>
                                        <Send className="w-4.5 h-4.5" />
                                        Copy & Open Substack
                                    </>
                                ) : (
                                    <>
                                        <ClipboardCheck className="w-4.5 h-4.5" />
                                        Content Copied
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleCopyTitle}
                                className="w-full py-3 bg-white border border-black/10 rounded-[20px] text-[11px] font-bold text-black/50 hover:text-black hover:bg-black/[0.02] transition-all flex items-center justify-center gap-2 h-[48px] active:scale-[0.98]"
                            >
                                {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedTitle ? 'Title Copied' : 'Copy Draft Title Separately'}
                            </button>
                        </div>

                        {step === 'copied' && (
                            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-[18px] animate-in slide-in-from-top-2 duration-300">
                                <p className="text-[11px] text-emerald-700 font-bold leading-tight text-center">
                                    ✨ Success! Substack is opening. Just hit Cmd+V (or Ctrl+V) in their editor.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Simple Copy Option */}
                    <div className="flex items-center gap-4 px-2">
                        <div className="flex-1 h-px bg-black/[0.05]" />
                        <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-black/[0.05]" />
                    </div>

                    <button
                        onClick={() => {
                            try {
                                if (navigator.clipboard) {
                                    navigator.clipboard.writeText(htmlContent);
                                    onClose();
                                } else {
                                    throw new Error('Insecure context');
                                }
                            } catch (e) {
                                // Fallback
                                const textArea = document.createElement("textarea");
                                textArea.value = htmlContent;
                                textArea.style.position = "fixed";
                                textArea.style.left = "-9999px";
                                textArea.style.top = "0";
                                document.body.appendChild(textArea);
                                textArea.focus();
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                                onClose();
                            }
                        }}
                        className="w-full p-4 hover:bg-black/[0.02] border border-black/[0.05] rounded-[24px] transition-all group flex items-center justify-between active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black/5 rounded-[14px] flex items-center justify-center group-hover:bg-black/10 transition-colors">
                                <Copy className="w-5 h-5 text-black/40" />
                            </div>
                            <div className="text-left">
                                <p className="text-[13px] font-black text-black">Copy Plain HTML</p>
                                <p className="text-[10px] text-black/30 font-medium tracking-tight">For custom platforms or raw editors</p>
                            </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-black/10" />
                    </button>
                </div>
            </div>
        </div>
    )
}
