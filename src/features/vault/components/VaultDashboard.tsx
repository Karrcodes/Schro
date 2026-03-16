import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Shield, Clipboard as ClipboardIcon, Key, Lock, Eye, EyeOff } from 'lucide-react'
import { useVault } from '../contexts/VaultContext'
import { cn } from '@/lib/utils'
import { Clipboard } from './Clipboard'
import { SecretsManager } from './SecretsManager'
import { KarrFooter } from '@/components/KarrFooter'

type VaultTab = 'clipboard' | 'secrets'

export function VaultDashboard({ defaultTab }: { defaultTab?: VaultTab }) {
    const pathname = usePathname()
    const { isVaultPrivate, toggleVaultPrivacy } = useVault()
    const activeTab = pathname.includes('/secrets') ? 'secrets' : 'clipboard'

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col w-full overflow-x-hidden">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between px-6 py-8 md:px-10 md:py-10 z-10 gap-6 max-w-7xl mx-auto w-full">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-purple-500 uppercase tracking-[0.3em]">Security Protocol</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Schrö Vault</h1>
                </div>
                <div className="flex items-center gap-4 h-fit mb-1">
                    <div className="text-[11px] text-black/25 uppercase tracking-[0.2em] font-black">
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                <main className="w-full max-w-7xl mx-auto px-6 md:px-10 pt-6 pb-20 flex-1 space-y-12">
                    {/* Sub-navigation Tabs */}
                    <div className="flex items-center justify-end gap-3 w-full mb-8">
                        <button
                            onClick={toggleVaultPrivacy}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all border shadow-sm active:scale-95",
                                isVaultPrivate
                                    ? "bg-blue-50 text-blue-600 border-blue-100 ring-1 ring-blue-500/10"
                                    : "bg-white text-black/60 border-black/[0.08] hover:border-black/20"
                            )}
                            title={isVaultPrivate ? "Disable Privacy Mode" : "Enable Privacy Mode"}
                        >
                            {isVaultPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{isVaultPrivate ? "Strict Privacy" : "Privacy Mode"}</span>
                        </button>

                        <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.05] items-center flex-1 sm:flex-initial">
                            <Link
                                href="/vault/clipboard"
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[12px] sm:text-[13px] font-bold transition-all ${activeTab === 'clipboard'
                                    ? 'bg-white text-black shadow-sm ring-1 ring-black/[0.02]'
                                    : 'text-black/40 hover:text-black/60 hover:bg-black/[0.02]'
                                    }`}
                            >
                                <ClipboardIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Clipboard</span>
                            </Link>
                            <Link
                                href="/vault/secrets"
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[12px] sm:text-[13px] font-bold transition-all ${activeTab === 'secrets'
                                    ? 'bg-white text-black shadow-sm ring-1 ring-black/[0.02]'
                                    : 'text-black/40 hover:text-black/60 hover:bg-black/[0.02]'
                                    }`}
                            >
                                <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Secrets</span>
                            </Link>
                        </div>
                    </div>


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
                </main>

                <div className="max-w-7xl mx-auto w-full px-6 md:px-10 pb-10">
                    <KarrFooter />
                </div>
            </div>
        </div>
    )
}
