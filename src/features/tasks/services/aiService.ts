import { supabase } from '@/lib/supabase'

export interface ExtractedTask {
    title: string
    priority: 'urgent' | 'high' | 'mid' | 'low'
    notes?: string
}

export const aiService = {
    async processQuickList(input: string | File): Promise<ExtractedTask[]> {
        const isImage = input instanceof File
        
        try {
            if (isImage) {
                const base64 = await fileToBase64(input)
                
                const { data, error } = await supabase.functions.invoke('process-magic-tasks', {
                    body: { 
                        image: base64, 
                        type: 'image',
                        mimeType: input.type
                    },
                })

                if (error) throw error
                if (data?.error) throw new Error(data.error)
                return data?.tasks || []
            } else {
                const { data, error } = await supabase.functions.invoke('process-magic-tasks', {
                    body: { text: input, type: 'text' },
                })

                if (error) throw error
                if (data?.error) throw new Error(data.error)
                return data?.tasks || []
            }
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
