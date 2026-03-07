'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white text-black p-8 md:p-24 max-w-4xl mx-auto">
            <Link href="/finances" className="inline-flex items-center gap-2 text-sm font-bold text-black mb-12 hover:underline">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>

            <header className="mb-16">
                <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
                <p className="text-black/40 font-medium">Last updated: February 20, 2026</p>
            </header>

            <div className="space-y-12 text-[15px] leading-relaxed text-black/70">
                <section>
                    <h2 className="text-xl font-bold text-black mb-4">1. Overview</h2>
                    <p>
                        Schrö is a life management system designed for private financial management.
                        This privacy policy explains how we handle your data when you connect your bank
                        accounts via Enable Banking.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-black mb-4">2. Data Collection</h2>
                    <p>
                        When you authorize a bank connection, Schrö accesses your transaction history
                        and account balances. This data is fetched via Enable Banking and stored
                        directly in your private database.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-black mb-4">3. Data Usage</h2>
                    <p>
                        Your data is used exclusively to provide you with financial insights,
                        automated ledger entries, and budget tracking within the Schrö dashboard.
                        We do not sell, share, or monetize your financial information.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-black mb-4">4. Security</h2>
                    <p>
                        We use industry-standard encryption and secure JWT signing to communicate
                        with banking APIs. Your credentials are never stored by Schrö;
                        authorization is handled via secure bank redirects.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-black mb-4">5. Third Parties</h2>
                    <p>
                        We use **Enable Banking** as our technical provider for Open Banking
                        connectivity. Their privacy policy applies to the data transmission
                        process between your bank and Schrö.
                    </p>
                </section>
            </div>

            <footer className="mt-24 pt-12 border-t border-black/[0.05] text-black/30 text-[13px]">
                &copy; 2026 Schrö. Built for privacy.
            </footer>
        </div>
    )
}
