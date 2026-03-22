import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function listModels() {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`)
        const data = await res.json()
        if (data.models) {
            console.log(data.models.map(m => m.name).join('\n'))
        } else {
            console.log('No models found:', data)
        }
    } catch (e) {
        console.error(e)
    }
}

listModels()
