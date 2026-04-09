'use client'

import { useState, forwardRef, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent, Editor, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Heading from '@tiptap/extension-heading'
import { Bold, Italic, Heading1, Heading2, Wand2, Image as ImageIcon, Loader2, Check, X, Sparkles, RotateCcw, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReflectZenEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export interface ReflectZenEditorRef {
    getEditor: () => Editor | null;
}

// Custom AI Loader Node for high-end preview state
const AILoaderNode = Node.create({
    name: 'aiLoader',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            label: { default: 'Working...' },
            id: { default: null }
        }
    },
    parseHTML() {
        return [{ tag: 'div[data-type="ai-loader"]' }]
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'ai-loader' })]
    },
    addNodeView() {
        return ReactNodeViewRenderer(AILoaderView)
    },
})

const AILoaderView = (props: any) => {
    return (
        <NodeViewWrapper className="ai-loader-node my-10 px-4">
            <div className="w-full h-40 rounded-[32px] bg-black/[0.02] border-2 border-dashed border-black/[0.08] flex flex-col items-center justify-center gap-6 animate-pulse shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5 opacity-50" />
                <div className="relative flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-xl flex items-center justify-center ring-1 ring-black/5">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                    <div className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <p className="text-[12px] font-black text-black uppercase tracking-[0.2em]">{props.node.attrs.label}</p>
                        </div>
                    </div>
                </div>
            </div>
        </NodeViewWrapper>
    )
}

const ZenImageView = (props: any) => {
    const { src, alt, prompt } = props.node.attrs

    const handleRegenerate = async () => {
        const pos = props.getPos()
        const editor = props.editor
        const loaderId = `regen-${Date.now()}`

        try {
            editor.chain()
                .focus()
                .insertContentAt(pos, {
                    type: 'aiLoader',
                    attrs: { label: 'Regenerating...', id: loaderId }
                })
                .deleteRange({ from: pos + 1, to: pos + 2 })
                .run()

            const res = await fetch(`/api/studio/cover?title=${encodeURIComponent(prompt || alt)}&json=true&type=content`)
            const data = await res.json()

            let loaderPos = -1
            editor.state.doc.descendants((node: any, p: number) => {
                if (node.type.name === 'aiLoader' && node.attrs.id === loaderId) {
                    loaderPos = p
                    return false
                }
            })

            if (res.ok && data.url && loaderPos !== -1) {
                editor.chain()
                    .focus()
                    .deleteRange({ from: loaderPos, to: loaderPos + 1 })
                    .insertContentAt(loaderPos, {
                        type: 'image',
                        attrs: { src: data.url, alt, prompt }
                    })
                    .run()
            } else if (loaderPos !== -1) {
                editor.chain().focus().deleteRange({ from: loaderPos, to: loaderPos + 1 }).run()
            }
        } catch (err) {
            console.error('AI Image Regeneration Failed:', err)
        }
    }

    return (
        <NodeViewWrapper className="relative my-8 group max-w-2xl mx-auto">
            <img
                src={src}
                alt={alt}
                className="rounded-[32px] shadow-xl max-w-full bg-black/5 mx-auto border border-black/5 transition-transform duration-500 group-hover:scale-[1.01] cursor-pointer"
            />
            {prompt && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                    <button
                        onClick={handleRegenerate}
                        className="p-2.5 bg-white border border-black/10 text-indigo-600 rounded-xl shadow-xl hover:bg-black hover:text-white hover:scale-110 active:scale-95 transition-all flex items-center gap-2 group/btn"
                    >
                        <RotateCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest pr-1">Regenerate</span>
                    </button>
                </div>
            )}
        </NodeViewWrapper>
    )
}

const ZenImage = Image.extend({
    name: 'image',
    addAttributes() {
        return {
            ...this.parent?.(),
            prompt: { default: null },
        }
    },
    addNodeView() {
        return ReactNodeViewRenderer(ZenImageView)
    },
})

export const ReflectZenEditor = forwardRef<ReflectZenEditorRef, ReflectZenEditorProps>(({ content, onChange, placeholder = 'Reflect on your day...' }, ref) => {
    const [isExpanding, setIsExpanding] = useState(false)
    const [expandPreview, setExpandPreview] = useState<string | null>(null)
    const [selectionUpdate, setSelectionUpdate] = useState(0)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            AILoaderNode,
            ZenImage,
            Heading.configure({
                levels: [1, 2],
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[400px] w-full text-[17px] text-black/80 font-medium leading-[1.8] break-words overflow-wrap-anywhere [&_h1]:text-[32px] [&_h1]:font-black [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:tracking-tight [&_h1]:leading-tight [&_h2]:text-[24px] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:tracking-tight [&_p]:mb-4 [&_strong]:font-black [&_strong]:text-black [&_em]:italic',
                style: 'font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        onSelectionUpdate: () => {
            setSelectionUpdate(Date.now())
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
        setExpandPreview(null)
        try {
            const res = await fetch('/api/ai/studio/expand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: selectedText })
            })
            const data = await res.json()
            if (data.text) {
                setExpandPreview(data.text)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsExpanding(false)
        }
    }

    const handleApproveExpand = () => {
        if (!editor || !expandPreview) return
        editor.chain().focus().insertContent(`\n\n${expandPreview}\n\n`).run()
        setExpandPreview(null)
    }

    if (!editor) return null

    return (
        <div className="w-full relative reflect-editor-wrapper">
            {/* Context Toolbar - Centered at bottom */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                <div className="flex bg-white/90 backdrop-blur-2xl border border-black/10 p-1.5 rounded-[24px] shadow-2xl shadow-indigo-500/10 ring-1 ring-black/5 items-center">
                    {/* Formatting */}
                    <div className="flex gap-1 pr-2 mr-2 border-r border-black/[0.05]">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90", editor.isActive('bold') ? "bg-black text-white shadow-lg" : "hover:bg-black/5 text-black/40 hover:text-black")}
                        >
                            <Bold className="w-4.5 h-4.5" />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90", editor.isActive('italic') ? "bg-black text-white shadow-lg" : "hover:bg-black/5 text-black/40 hover:text-black")}
                        >
                            <Italic className="w-4.5 h-4.5" />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90", editor.isActive('heading', { level: 1 }) ? "bg-black text-white shadow-lg" : "hover:bg-black/5 text-black/40 hover:text-black")}
                        >
                            <Heading1 className="w-4.5 h-4.5" />
                        </button>
                    </div>

                    {/* AI Tools */}
                    <div className="flex gap-1">
                        <button
                            onClick={handleExpandSelection}
                            disabled={isExpanding || editor.state.selection.empty}
                            className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
                                (isExpanding || editor.state.selection.empty) ? "opacity-30 grayscale cursor-not-allowed" : "text-indigo-500 hover:bg-indigo-50 hover:shadow-indigo-500/10"
                            )}
                            title="AI Expand Selection"
                        >
                            {isExpanding ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Wand2 className="w-4.5 h-4.5" />}
                        </button>
                    </div>
                </div>

                {/* Status indicator */}
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-500",
                    isExpanding ? "bg-indigo-500 animate-pulse scale-125" : "bg-black/10"
                )} />
            </div>

            {/* AI Proposal Overlay */}
            {expandPreview && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-[200] animate-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-black/95 backdrop-blur-2xl text-white rounded-[32px] shadow-2xl border border-white/10 overflow-hidden">
                        <div className="p-6 pb-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <Sparkles className="w-5 h-5 text-indigo-400" />
                                    <span className="text-[12px] font-black uppercase tracking-widest text-indigo-400">AI Proposal</span>
                                </div>
                                <button onClick={() => setExpandPreview(null)} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="bg-white/[0.05] rounded-2xl p-4 max-h-[200px] overflow-y-auto no-scrollbar">
                                <p className="text-[14px] leading-relaxed text-white/90 font-medium">
                                    {expandPreview}
                                </p>
                            </div>
                        </div>
                        <div className="p-4 pt-0">
                            <button
                                onClick={handleApproveExpand}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Check className="w-4 h-4" />
                                Weave into Reflection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <EditorContent editor={editor} className="min-h-full" />
        </div>
    )
})
