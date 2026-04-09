export const dynamic = 'force-dynamic'
aim for a "directive" that feels like a law of nature.
            3. Use strong, active verbs.
            4. Bridge the gap between internal state (agency/courage) and external reality (monetization/sovereignty).
            5. Do not use flowery language or "you can do it" tropes.
            
            Output the raw text of the axiom only.
        `

        const result = await geminiModel.generateContent(prompt)
        const response = await result.response
        const text = response.text().trim()

        return NextResponse.json({ axiom: text })
    } catch (error: any) {
        console.error('Axiom synthesis error:', error)
        return NextResponse.json({ error: 'Failed to synthesize axiom.' }, { status: 500 })
    }
}
