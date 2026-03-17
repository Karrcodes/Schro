import { supabase } from '@/lib/supabase'

export interface ExtractedTask {
    title: string
    priority: 'super' | 'high' | 'mid' | 'low'
    notes?: string
}

export const aiService = {
    async processQuickList(input: string | File): Promise<ExtractedTask[]> {
        const isImage = input instanceof File
        
        try {
            const response = await fetch('/api/process-magic-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    isImage 
                        ? { image: await fileToBase64(input), type: 'image', mimeType: input.type }
                        : { text: input, type: 'text' }
                )
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to process request');
            return data.tasks || [];
        } catch (error: any) {
            console.error('Error in aiService.processQuickList:', error)
            if (isImage) {
                const message = error.message || error.details || 'Could not read image.'
                throw new Error(`${message} Please ensure the text is clear.`)
            }
            // Fallback for text if AI fails
            return (input as string).split('\n')
                .filter(line => line.trim())
                .map(line => ({
                    title: line.replace(/^[-*•\d.]\s*/, '').trim(),
                    priority: 'mid'
                }))
        }
    }
}

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1]
            resolve(base64String)
        }
        reader.onerror = error => reject(error)
    })
}
