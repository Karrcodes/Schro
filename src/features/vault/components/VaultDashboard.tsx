import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { Shield, Clipboard as ClipboardIcon, Key, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useVault } from '../contexts/VaultContext'
import { cn } from '@/lib/utils'
import { Clipboard } from './Clipboard'
import { SecretsManager } from './SecretsManager'
import { VaultPinModal } from './VaultPinModal'
import { VaultPinEntry } from './VaultPinEntry'

type VaultTab = 'clipboard' | 'secrets'

export function VaultDashboard({ defaultTab }: { defaultTab?: VaultTab }) {
    const pathname = usePathname()
    const { isVaultPrivate, toggleVaultPrivacy, isVaultLocked, isVaultAuthenticated } = useVault()
    const [isPinModalOpen, setIsPinModalOpen] = useState(false)
    const activeTab = pathname.includes('/secrets') ? 'secrets' : 'clipboard'

    const showVaultContent = !isVaultLocked || isVaultAuthenticated

    return (
        <div className="flex flex-col space-y-12">
            {/* Page Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between z-10 gap-6 pb-2">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-purple-500 uppercase tracking-[0.3em]">Security Protocol</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Schrö Vault</h1>
                </div>

                <div className="flex items-center gap-3 h-fit mb-1">
                    <button
                        onClick={toggleVaultPrivacy}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all border shadow-sm active:scale-95 shrink-0",
                            isVaultPrivate
                                ? "bg-blue-50 text-blue-600 border-blue-100 ring-1 ring-blue-500/10"
                                : "bg-white text-black/60 border-black/[0.08] hover:border-black/20"
                        )}
                        title={isVaultPrivate ? "Disable Privacy Mode" : "Enable Privacy Mode"}
                    >
                        {isVaultPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isVaultPrivate ? "Strict Privacy" : "Privacy Mode"}</span>
                    </button>

                    <button
                        onClick={() => setIsPinModalOpen(true)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all border shadow-sm active:scale-95 shrink-0",
                            isVaultLocked
                                ? "bg-orange-50 text-orange-600 border-orange-100 ring-1 ring-orange-500/10"
                                : "bg-white text-black/60 border-black/[0.08] hover:border-black/20"
                        )}
                        title={isVaultLocked ? "Vault Locked (PIN required)" : "Lock Vault"}
                    >
                        {isVaultLocked ? <ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> : <Lock className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isVaultLocked ? "Locked" : "Lock Vault"}</span>
                    </button>

                    <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.05] items-center shrink-0">
                        <Link
                            href="/vault/clipboard"
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'clipboard'
                                ? 'bg-white text-black shadow-sm ring-1 ring-black/[0.02]'
                                : 'text-black/40 hover:text-black/60 hover:bg-black/[0.02]'
                                }`}
                        >
                            <ClipboardIcon className="w-4 h-4" />
                            <span className="hidden xs:inline">Clipboard</span>
                        </Link>
                        <Link
                            href="/vault/secrets"
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'secrets'
                                ? 'bg-white text-black shadow-sm ring-1 ring-black/[0.02]'
                                : 'text-black/40 hover:text-black/60 hover:bg-black/[0.02]'
                                }`}
                        >
                            <Key className="w-4 h-4" />
                            <span className="hidden xs:inline">Secrets</span>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="space-y-12">
                {!showVaultContent ? (
                    <section className="animate-in fade-in zoom-in-95 duration-500">
                        <VaultPinEntry />
                    </section>
                ) : (
                    <>
                        {activeTab === 'clipboard' ? (
                            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="mb-6">
                                    <h2 className="text-lg font-bold text-black flex items-center gap-2">
                                        <span>📋</span> Clipboard
                                    </h2>
                                    <p className="text-[12px] text-black/40 font-medium">Instantly share text and links between your devices</p>
                                </div>
                                <Clipboard />
                            </section>
                        ) : (
                            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <SecretsManager />
                            </section>
                        )}

                        {/* Security Note */}
                        <div className="mt-16 pt-8 border-t border-black/[0.06] flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-black/[0.03] flex items-center justify-center">
                                <Lock className="w-4 h-4 text-black/20" />
                            </div>
                            <p className="text-[11px] text-center text-black/20 font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                                End-to-End Encryption Logic Pending <br />
                                Data is currently stored in secure database
                            </p>
                        </div>
                    </>
                )}
            </div>

            <VaultPinModal 
                isOpen={isPinModalOpen} 
                onClose={() => setIsPinModalOpen(false)} 
            />
        </div>
    )
}
