import { useState, forwardRef, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent, Editor, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Heading from '@tiptap/extension-heading'
import { Bold, Italic, Heading1, Heading2, Type, Wand2, Image as ImageIcon, Loader2, Check, X, Sparkles, Search, Dna } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ZenEditorProps {
    content: string;
    onChange: (content: string) => void;
    onDropNode: (data: any, plainText?: string) => void;
}

export interface ZenEditorRef {
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
            <div className="w-full h-64 md:h-80 rounded-[32px] bg-black/[0.02] border-2 border-dashed border-black/[0.08] flex flex-col items-center justify-center gap-6 animate-pulse shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5 opacity-50" />

                <div className="relative flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center ring-1 ring-black/5">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>

                    <div className="text-center">
                        <div className="flex items-center gap-2 justify-center mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <p className="text-[14px] font-black text-black uppercase tracking-[0.2em]">{props.node.attrs.label}</p>
                        </div>
                        <p className="text-[11px] text-black/30 font-bold max-w-[200px] leading-relaxed italic">
                            "Nanobana is weaving pixels into your story..."
                        </p>
                    </div>
                </div>

                {/* Decorative particles */}
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-indigo-300 rounded-full animate-ping" />
                <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-ping delay-300" />
                <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-purple-300 rounded-full animate-ping delay-700" />
            </div>
        </NodeViewWrapper>
    )
}

export const ZenEditor = forwardRef<ZenEditorRef, ZenEditorProps>(({ content, onChange, onDropNode }, ref) => {
    const [isExpanding, setIsExpanding] = useState(false)
    const [expandPreview, setExpandPreview] = useState<string | null>(null)
    const [isGeneratingImage, setIsGeneratingImage] = useState(false)
    const [isFindingImage, setIsFindingImage] = useState(false)
    const [showImageOptions, setShowImageOptions] = useState(false)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            AILoaderNode,
            Heading.configure({
                levels: [1, 2, 3],
            }),
            Placeholder.configure({
                placeholder: 'Start writing...',
            }),
            Image.configure({
                inline: true,
                HTMLAttributes: {
                    class: 'rounded-3xl shadow-2xl my-10 max-w-full bg-black/5 mx-auto border border-black/5 animate-in slide-in-from-bottom-4 duration-700',
                },
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[500px] w-full text-[19px] text-black/80 font-medium leading-[1.85] break-words overflow-wrap-anywhere [&_h1]:text-[42px] [&_h1]:font-black [&_h1]:mt-12 [&_h1]:mb-6 [&_h1]:tracking-tight [&_h1]:leading-tight [&_h2]:text-[28px] [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:tracking-tight [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-4 [&_p]:mb-6 [&_strong]:font-black [&_strong]:text-black [&_em]:italic [&_img]:shadow-2xl [&_img]:rounded-[32px]',
                style: 'font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
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

    const handleGenerateImage = async () => {
        if (!editor || editor.state.selection.empty) return
        const { from } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
        )

        setIsGeneratingImage(true)
        setShowImageOptions(false)

        // Insert loader above selection
        editor.chain().focus().insertContentAt(from, {
            type: 'aiLoader',
            attrs: { label: 'Generating Art...' }
        }).run()

        try {
            const res = await fetch('/api/ai/studio/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: selectedText })
            })
            const data = await res.json()

            // Find current loader position
            let loaderPos = -1
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'aiLoader') {
                    loaderPos = pos
                    return false
                }
            })

            if (data.url && loaderPos !== -1) {
                editor.chain()
                    .focus()
                    .deleteRange({ from: loaderPos, to: loaderPos + 1 })
                    .insertContentAt(loaderPos, {
                        type: 'image',
                        attrs: { src: data.url, alt: selectedText }
                    })
                    .run()
            } else if (loaderPos !== -1) {
                editor.chain().focus().deleteRange({ from: loaderPos, to: loaderPos + 1 }).run()
            }
        } catch (err) {
            console.error(err)
            // Cleanup loader on error
            let loaderPos = -1
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'aiLoader') {
                    loaderPos = pos
                    return false
                }
            })
            if (loaderPos !== -1) {
                editor.chain().focus().deleteRange({ from: loaderPos, to: loaderPos + 1 }).run()
            }
        } finally {
            setIsGeneratingImage(false)
        }
    }

    const handleFindImage = async () => {
        if (!editor || editor.state.selection.empty) return
        const { from } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
        )

        setIsFindingImage(true)
        setShowImageOptions(false)

        // Insert loader above selection
        editor.chain().focus().insertContentAt(from, {
            type: 'aiLoader',
            attrs: { label: 'Finding AI Photo...' }
        }).run()

        try {
            const res = await fetch('/api/ai/studio/find-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: selectedText })
            })
            const data = await res.json()

            // Find current loader position
            let loaderPos = -1
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'aiLoader') {
                    loaderPos = pos
                    return false
                }
            })

            if (data.url && loaderPos !== -1) {
                editor.chain()
                    .focus()
                    .deleteRange({ from: loaderPos, to: loaderPos + 1 })
                    .insertContentAt(loaderPos, {
                        type: 'image',
                        attrs: { src: data.url, alt: selectedText }
                    })
                    .run()
            } else if (loaderPos !== -1) {
                editor.chain().focus().deleteRange({ from: loaderPos, to: loaderPos + 1 }).run()
            }
        } catch (err) {
            console.error(err)
            // Cleanup loader on error
            let loaderPos = -1
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'aiLoader') {
                    loaderPos = pos
                    return false
                }
            })
            if (loaderPos !== -1) {
                editor.chain().focus().deleteRange({ from: loaderPos, to: loaderPos + 1 }).run()
            }
        } finally {
            setIsFindingImage(false)
        }
    }

    if (!editor) return null

    return (
        <div className="w-full relative studio-editor-wrapper">
            {editor && (
                <BubbleMenu editor={editor} className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xl border border-black/10 p-2 rounded-2xl shadow-2xl shadow-black/10 z-50 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
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

                    {/* Expand with Approval */}
                    <button
                        onClick={handleExpandSelection}
                        disabled={isExpanding || !!expandPreview}
                        className={cn(
                            "p-2.5 hover:bg-indigo-50 rounded-xl transition-all active:scale-90 flex items-center gap-2 group",
                            (isExpanding || expandPreview) && "opacity-50"
                        )}
                    >
                        {isExpanding ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : <Wand2 className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />}
                        <span className="text-[12px] font-black text-indigo-600 tracking-wide pr-1">Expand</span>
                    </button>

                    {/* AI Image Dual Menu */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowImageOptions(!showImageOptions)
                            }}
                            disabled={isGeneratingImage || isFindingImage}
                            className={cn(
                                "p-2.5 hover:bg-emerald-50 rounded-xl transition-all active:scale-90 flex items-center gap-2 group",
                                (showImageOptions || isGeneratingImage || isFindingImage) && "bg-emerald-50"
                            )
                            }
                        >
                            {isGeneratingImage || isFindingImage ? (
                                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                            ) : (
                                <ImageIcon className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-[12px] font-black text-emerald-600 tracking-wide pr-1">Image</span>
                        </button>

                        {showImageOptions && (
                            <div className="absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-xl border border-black/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2 min-w-[200px] z-[60] flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={handleFindImage}
                                    className="flex items-center gap-3 p-3 hover:bg-black/5 rounded-xl transition-all text-left group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">
                                        <Search className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-black text-black">Find AI Photo</div>
                                        <div className="text-[9px] text-black/40 font-medium whitespace-nowrap">Authentic stock search</div>
                                    </div>
                                </button>
                                <button
                                    onClick={handleGenerateImage}
                                    className="flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-xl transition-all text-left group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-sm">
                                        <Dna className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-black text-black">Nanobana Gen</div>
                                        <div className="text-[9px] text-black/40 font-medium whitespace-nowrap">Create masterpiece art</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </BubbleMenu>
            )}

            {/* AI Expansion Proposal Overlay */}
            {expandPreview && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-[200] animate-in slide-in-from-bottom-8 duration-600">
                    <div className="bg-black/90 backdrop-blur-2xl text-white rounded-[32px] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.6)] border border-white/20 overflow-hidden ring-1 ring-white/10">
                        <div className="p-8 pb-4">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                        <Sparkles className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-[16px] font-black tracking-tight flex items-center gap-2">
                                            Nanobana Expansion
                                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-full">Draft</span>
                                        </h4>
                                        <p className="text-[11px] text-white/40 font-medium">Review the following proposal before it's woven into your story.</p>
                                    </div>
                                </div>
                                <button onClick={() => setExpandPreview(null)} className="p-2 hover:bg-white/10 rounded-full text-white/20 hover:text-white transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="bg-white/[0.04] rounded-2xl p-6 border border-white/[0.1] max-h-[300px] overflow-y-auto no-scrollbar shadow-inner">
                                <p className="text-[16px] leading-[1.7] text-white/90 font-medium whitespace-pre-wrap">
                                    {expandPreview}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 pt-2 flex items-center gap-3">
                            <button
                                onClick={handleApproveExpand}
                                className="flex-1 py-4.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] text-[13px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-2xl shadow-indigo-600/40 h-[60px]"
                            >
                                <Check className="w-4.5 h-4.5" />
                                Weave Into Article
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <EditorContent editor={editor} className="min-h-full" />
        </div>
    )
})
