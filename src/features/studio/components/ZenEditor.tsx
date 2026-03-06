import { useState, forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Heading from '@tiptap/extension-heading'
import { Bold, Italic, Heading1, Heading2, Type, Wand2, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ZenEditorProps {
    content: string;
    onChange: (content: string) => void;
    onDropNode: (data: any, plainText?: string) => void;
}

export interface ZenEditorRef {
    getEditor: () => Editor | null;
}

export const ZenEditor = forwardRef<ZenEditorRef, ZenEditorProps>(({ content, onChange, onDropNode }, ref) => {
    const [isExpanding, setIsExpanding] = useState(false)
    const [isGeneratingImage, setIsGeneratingImage] = useState(false)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Heading.configure({
                levels: [1, 2, 3],
            }),
            Placeholder.configure({
                placeholder: 'Start writing...',
            }),
            Image.configure({
                inline: true,
                HTMLAttributes: {
                    class: 'rounded-2xl shadow-xl my-8 max-w-full bg-black/5 mx-auto',
                },
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[500px] w-full text-[18px] text-black/80 leading-[1.8] font-medium break-words overflow-wrap-anywhere [&_h1]:text-4xl [&_h1]:font-black [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:tracking-tight [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:tracking-tight [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-5 [&_strong]:font-bold [&_strong]:text-black [&_em]:italic',
                style: 'font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;'
            },
            handleDrop: (view, event, slice, moved) => {
                const plainText = event.dataTransfer?.getData('text/plain')
                const jsonData = event.dataTransfer?.getData('application/json')

                if (jsonData) {
                    try {
                        const data = JSON.parse(jsonData)
                        if (data.id && data.type) {
                            onDropNode(data, plainText)
                            return true // Handled
                        }
                    } catch (err) { }
                }

                return false;
            }
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        }
    })

    useImperativeHandle(ref, () => ({
        getEditor: () => editor
    }), [editor])

    const handleExpandSelection = async () => {
        if (!editor || editor.state.selection.empty) return
        const selectedText = editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
        )

        setIsExpanding(true)
        try {
            const res = await fetch('/api/ai/studio/expand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: selectedText })
            })
            const data = await res.json()
            if (data.text) {
                editor.chain().focus().insertContent(`\n\n${data.text}\n\n`).run()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsExpanding(false)
        }
    }

    const handleGenerateImage = async () => {
        if (!editor || editor.state.selection.empty) return
        const selectedText = editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
        )

        setIsGeneratingImage(true)
        try {
            const res = await fetch('/api/ai/studio/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: selectedText })
            })
            const data = await res.json()
            if (data.url) {
                editor.chain().focus().setImage({ src: data.url, alt: selectedText }).run()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsGeneratingImage(false)
        }
    }

    if (!editor) return null

    return (
        <div className="w-full relative studio-editor-wrapper">
            {editor && (
                <BubbleMenu editor={editor} className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xl border border-black/10 p-2 rounded-2xl shadow-2xl shadow-black/10 z-50">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={cn("p-2.5 rounded-xl transition-all active:scale-90", editor.isActive('bold') ? "bg-black/10" : "hover:bg-black/5")}
                    >
                        <Bold className="w-5 h-5 text-black/80" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={cn("p-2.5 rounded-xl transition-all active:scale-90", editor.isActive('italic') ? "bg-black/10" : "hover:bg-black/5")}
                    >
                        <Italic className="w-5 h-5 text-black/80" />
                    </button>
                    <div className="w-px h-4 bg-black/10 mx-1" />
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={cn("p-2.5 rounded-xl transition-all active:scale-90", editor.isActive('heading', { level: 1 }) ? "bg-black/10" : "hover:bg-black/5")}
                    >
                        <Heading1 className="w-5 h-5 text-black/80" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={cn("p-2.5 rounded-xl transition-all active:scale-90", editor.isActive('heading', { level: 2 }) ? "bg-black/10" : "hover:bg-black/5")}
                    >
                        <Heading2 className="w-5 h-5 text-black/80" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().setParagraph().run()}
                        className={cn("p-2.5 rounded-xl transition-all active:scale-90", editor.isActive('paragraph') ? "bg-black/10" : "hover:bg-black/5")}
                    >
                        <Type className="w-5 h-5 text-black/80" />
                    </button>
                    <div className="w-px h-4 bg-black/10 mx-1" />

                    {/* AI Actions */}
                    <button
                        onClick={handleExpandSelection}
                        disabled={isExpanding}
                        className="p-2.5 hover:bg-indigo-50 rounded-xl transition-all active:scale-90 flex items-center gap-2 group"
                    >
                        {isExpanding ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : <Wand2 className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />}
                        <span className="text-[12px] font-bold text-indigo-600 tracking-wide pr-1">Expand</span>
                    </button>
                    <button
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage}
                        className="p-2.5 hover:bg-emerald-50 rounded-xl transition-all active:scale-90 flex items-center gap-2 group"
                    >
                        {isGeneratingImage ? <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /> : <ImageIcon className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />}
                        <span className="text-[12px] font-bold text-emerald-600 tracking-wide pr-1">Image</span>
                    </button>
                </BubbleMenu>
            )}

            <EditorContent editor={editor} className="min-h-full" />
        </div>
    )
})
