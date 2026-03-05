'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ZoomIn, ZoomOut, Maximize2, Shuffle, ArrowUpRight, Archive, Trash2, Plus, Rocket, Video, X, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CanvasConnection, CanvasColor, StudioCanvasEntry, StudioProject, StudioContent, PolymorphicNode } from '../types/studio.types'

const NODE_W = 180
const NODE_H = 100

const COLOR_DOT: Record<CanvasColor, string> = {
    default: 'bg-black/15',
    yellow: 'bg-amber-400',
    blue: 'bg-blue-400',
    green: 'bg-emerald-400',
    purple: 'bg-purple-400',
    red: 'bg-rose-400',
}

const COLOR_BORDER: Record<CanvasColor, string> = {
    default: 'border-black/10',
    yellow: 'border-amber-200',
    blue: 'border-blue-200',
    green: 'border-emerald-200',
    purple: 'border-purple-200',
    red: 'border-rose-200',
}

function autoPosition(nodes: PolymorphicNode[]) {
    // Place unpositioned nodes in a grid
    const cols = Math.ceil(Math.sqrt(nodes.length))
    const gap = 220
    return nodes.map((n, i) => ({
        id: n.id,
        x: n.web_x ?? (i % cols) * gap + 80,
        y: n.web_y ?? Math.floor(i / cols) * (NODE_H + gap * 0.6) + 80,
    }))
}

interface Props {
    entries: PolymorphicNode[]
    connections: CanvasConnection[]
    onNodeClick: (node: PolymorphicNode) => void
    onCreateConnection: (fromId: string, toId: string) => void
    onDeleteConnection: (id: string) => void
    onUpdatePosition: (id: string, x: number, y: number) => void
    onDeleteNode: (id: string) => void
    onArchiveNode: (id: string) => void
    onRemoveNode: (id: string) => void
    onCreateNode: (data: { title: string; x: number; y: number }) => void
    onDropNode: (id: string, type: 'entry' | 'project' | 'content', x: number, y: number) => void
    isLibraryOpen?: boolean
    onOverLibraryChange?: (isOver: boolean) => void
    onCompose?: (nodes: PolymorphicNode[]) => void
}

export default function CanvasWebView({
    entries, connections, onNodeClick, onCreateConnection, onDeleteConnection, onUpdatePosition,
    onDeleteNode, onArchiveNode, onRemoveNode, onCreateNode, onDropNode, isLibraryOpen, onOverLibraryChange,
    onCompose
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [pan, setPan] = useState({ x: 60, y: 60 })
    const [zoom, setZoom] = useState(1)
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [connectingFrom, setConnectingFrom] = useState<{ id: string, side: 'top' | 'bottom' | 'left' | 'right' } | null>(null)
    const [pendingLine, setPendingLine] = useState<{ x: number; y: number } | null>(null)
    const [hoveredNode, setHoveredNode] = useState<string | null>(null)
    const [hoverSide, setHoverSide] = useState<'top' | 'bottom' | 'left' | 'right'>('right')
    const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
    const [hoveredControl, setHoveredControl] = useState<string | null>(null)
    const [magneticNode, setMagneticNode] = useState<string | null>(null)
    const [isOverLibrary, setIsOverLibrary] = useState(false)
    const [animatingRemovalId, setAnimatingRemovalId] = useState<string | null>(null)
    const [removalTarget, setRemovalTarget] = useState<{ x: number, y: number } | null>(null)
    const [ghostCoords, setGhostCoords] = useState<{ x: number, y: number } | null>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

    const dragStart = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null)
    const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
    const marqueeStart = useRef<{ x: number; y: number } | null>(null)
    const isPanning = useRef(false)

    // Initialise positions from persisted data + auto-layout for unpositioned
    useEffect(() => {
        const autoPos = autoPosition(entries)
        const next: Record<string, { x: number; y: number }> = {}
        autoPos.forEach(p => { next[p.id] = { x: p.x, y: p.y } })
        setPositions(prev => {
            const merged = { ...prev }
            Object.entries(next).forEach(([id, pos]) => {
                if (!merged[id]) merged[id] = pos
            })
            return merged
        })
    }, [entries])

    const getPos = (id: string) => positions[id] ?? { x: 80, y: 80 }

    // ---- Zoom/Scroll Lock ----
    useEffect(() => {
        const div = containerRef.current
        if (!div) return
        const handleWheel = (e: WheelEvent) => {
            // Prevent page scroll when over the canvas
            e.preventDefault()
            const delta = e.deltaY
            setZoom(z => Math.max(0.3, Math.min(2.5, z - delta * 0.001)))
        }
        div.addEventListener('wheel', handleWheel, { passive: false })
        return () => div.removeEventListener('wheel', handleWheel)
    }, [])

    // ---- Global Drag/Pan Tracking ----
    useEffect(() => {
        if (!draggingId && !isPanning.current && !connectingFrom && !marqueeBox) return

        const handleGlobalMouseMove = (e: MouseEvent) => {
            // Re-type event for compatibility with existing logic
            const reactEvent = e as unknown as React.MouseEvent

            if (draggingId && dragStart.current) {
                const dx = (e.clientX - dragStart.current.mx) / zoom
                const dy = (e.clientY - dragStart.current.my) / zoom
                const nx = dragStart.current.nx + dx
                const ny = dragStart.current.ny + dy
                setPositions(prev => ({ ...prev, [draggingId]: { x: nx, y: ny } }))

                // Library drop detection (Global)
                const rect = containerRef.current?.getBoundingClientRect()
                if (rect && isLibraryOpen) {
                    const over = e.clientX < rect.left
                    if (over !== isOverLibrary) {
                        setIsOverLibrary(over)
                        onOverLibraryChange?.(over)
                    }
                }
                setGhostCoords({ x: e.clientX, y: e.clientY })
            } else if (isPanning.current && panStart.current) {
                setPan({
                    x: panStart.current.px + (e.clientX - panStart.current.mx),
                    y: panStart.current.py + (e.clientY - panStart.current.my),
                })
            } else if (marqueeStart.current) {
                const x1 = Math.min(e.clientX, marqueeStart.current.x)
                const y1 = Math.min(e.clientY, marqueeStart.current.y)
                const x2 = Math.max(e.clientX, marqueeStart.current.x)
                const y2 = Math.max(e.clientY, marqueeStart.current.y)
                setMarqueeBox({ x1, y1, x2, y2 })

                const rect = containerRef.current?.getBoundingClientRect()
                if (rect) {
                    const cx1 = (x1 - rect.left - pan.x) / zoom
                    const cy1 = (y1 - rect.top - pan.y) / zoom
                    const cx2 = (x2 - rect.left - pan.x) / zoom
                    const cy2 = (y2 - rect.top - pan.y) / zoom

                    const ids = entries.filter(n => {
                        const p = getPos(n.id)
                        return p.x >= cx1 && p.x + NODE_W <= cx2 && p.y >= cy1 && p.y + NODE_H <= cy2
                    }).map(n => n.id)
                    setSelectedIds(ids)
                }
            }
            if (connectingFrom) {
                const rect = containerRef.current?.getBoundingClientRect()
                if (rect) {
                    const mx = (e.clientX - rect.left - pan.x) / zoom
                    const my = (e.clientY - rect.top - pan.y) / zoom

                    let closest: string | null = null
                    let minD = 50
                    let snappedPoint = { x: mx, y: my }

                    entries.forEach(node => {
                        if (node.id === connectingFrom.id) return
                        const p = getPos(node.id)
                        const sides: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right']
                        sides.forEach(side => {
                            const portPos = getPortPos(p, side)
                            const dx = mx - portPos.x
                            const dy = my - portPos.y
                            const dist = Math.sqrt(dx * dx + dy * dy)
                            if (dist < minD) {
                                minD = dist
                                closest = node.id
                                snappedPoint = portPos
                            }
                        })
                    })
                    setPendingLine(snappedPoint)
                    setMagneticNode(closest)
                }
            }
        }

        const handleGlobalMouseUp = (e: MouseEvent) => {
            if (marqueeStart.current) {
                marqueeStart.current = null
                setMarqueeBox(null)
            }

            if (draggingId) {
                const rect = containerRef.current?.getBoundingClientRect()
                if (isLibraryOpen && rect && e.clientX < rect.left) {
                    // Fly-back animation
                    setAnimatingRemovalId(draggingId)
                    setRemovalTarget({ x: rect.left - 100, y: e.clientY })
                    setTimeout(() => {
                        onRemoveNode(draggingId)
                        setAnimatingRemovalId(null)
                        setRemovalTarget(null)
                    }, 300)
                    setIsOverLibrary(false)
                    onOverLibraryChange?.(false)
                } else {
                    const pos = positions[draggingId]
                    if (pos) onUpdatePosition(draggingId, pos.x, pos.y)
                }
            }

            if (connectingFrom && magneticNode) {
                onCreateConnection(connectingFrom.id, magneticNode)
                setConnectingFrom(null)
                setPendingLine(null)
                setMagneticNode(null)
            } else if (connectingFrom && !magneticNode) {
                // If it's a click-drag, we might want to clear it, but for click-to-connect we keep it
                // Logic based on dragStart? For now cancel on mouseup if not snapped and moved a bit
                if (dragStart.current && Math.abs(e.clientX - dragStart.current.mx) > 5) {
                    setConnectingFrom(null)
                    setPendingLine(null)
                }
            }

            setDraggingId(null)
            setGhostCoords(null)
            setIsOverLibrary(false)
            onOverLibraryChange?.(false)
            dragStart.current = null
            isPanning.current = false
            panStart.current = null
            setMagneticNode(null)
        }

        window.addEventListener('mousemove', handleGlobalMouseMove)
        window.addEventListener('mouseup', handleGlobalMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove)
            window.removeEventListener('mouseup', handleGlobalMouseUp)
        }
    }, [draggingId, isOverLibrary, isLibraryOpen, zoom, pan, entries, positions, connectingFrom, magneticNode, onUpdatePosition, onRemoveNode, onCreateConnection, onOverLibraryChange])

    // ---- iPad Native Pointer Drop Support ----
    useEffect(() => {
        const handlePointerDrop = (e: any) => {
            const { id, type, clientX, clientY } = e.detail
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect && id && type) {
                const x = (clientX - rect.left - pan.x) / zoom - (NODE_W / 2)
                const y = (clientY - rect.top - pan.y) / zoom - 20
                onDropNode(id, type, x, y)
            }
        }
        window.addEventListener('studio-canvas-pointer-drop', handlePointerDrop)
        return () => window.removeEventListener('studio-canvas-pointer-drop', handlePointerDrop)
    }, [pan, zoom, onDropNode])

    // ---- Pan (background drag) ----
    const onBgMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return
        if ((e.target as HTMLElement).closest('[data-node]')) return

        if (e.shiftKey) {
            marqueeStart.current = { x: e.clientX, y: e.clientY }
            setSelectedIds([])
        } else {
            isPanning.current = true
            panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
            setSelectedIds([])
        }
    }

    // ---- Node interaction ----
    const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (connectingFrom || (e.target as HTMLElement).closest('[data-handle]')) return

        if (e.shiftKey) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
        } else {
            if (!selectedIds.includes(id)) setSelectedIds([id])
            setDraggingId(id)
            const pos = getPos(id)
            dragStart.current = { mx: e.clientX, my: e.clientY, nx: pos.x, ny: pos.y }
        }
    }
    const onNodeMouseMove = (e: React.MouseEvent, id: string) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const mx = e.clientX - rect.left, my = e.clientY - rect.top
        const dx = mx - rect.width / 2, dy = my - rect.height / 2

        if (Math.abs(dx) > Math.abs(dy)) setHoverSide(dx > 0 ? 'right' : 'left')
        else setHoverSide(dy > 0 ? 'bottom' : 'top')
    }

    const handleNodeClick = (e: React.MouseEvent, node: PolymorphicNode) => {
        e.stopPropagation()
        if (draggingId) return
        if (connectingFrom) {
            if (connectingFrom.id !== node.id) {
                onCreateConnection(connectingFrom.id, node.id)
            }
            setConnectingFrom(null)
            setPendingLine(null)
            return
        }
        // Removed global onNodeClick to prevent accidental opens
    }

    const startConnect = (e: React.MouseEvent, id: string, side: 'top' | 'bottom' | 'left' | 'right') => {
        e.stopPropagation()
        e.preventDefault()
        setConnectingFrom({ id, side })
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
            setPendingLine({
                x: (e.clientX - rect.left - pan.x) / zoom,
                y: (e.clientY - rect.top - pan.y) / zoom,
            })
        }
    }

    const cancelConnect = () => {
        setConnectingFrom(null)
        setPendingLine(null)
    }

    // ---- Auto-arrange ----
    const autoArrange = () => {
        const next: Record<string, { x: number; y: number }> = {}
        autoPosition(entries.map(e => ({ ...e, web_x: null, web_y: null }))).forEach(p => {
            next[p.id] = { x: p.x, y: p.y }
        })
        setPositions(next)
        entries.forEach(e => {
            const p = next[e.id]
            if (p) onUpdatePosition(e.id, p.x, p.y)
        })
    }

    const ControlTooltip = ({ label, id }: { label: string, id: string }) => (
        <div className={cn(
            "absolute right-full mr-3 px-2.5 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-lg whitespace-nowrap transition-all duration-200 pointer-events-none z-[100] shadow-xl",
            hoveredControl === id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
        )}>
            {label}
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-y-[4px] border-y-transparent border-l-[4px] border-l-black" />
        </div>
    )

    // ---- Ports & Paths ----
    const getPortPos = (nodePos: { x: number; y: number }, side: 'top' | 'bottom' | 'left' | 'right') => {
        switch (side) {
            case 'top': return { x: nodePos.x + NODE_W / 2, y: nodePos.y }
            case 'bottom': return { x: nodePos.x + NODE_W / 2, y: nodePos.y + NODE_H }
            case 'left': return { x: nodePos.x, y: nodePos.y + NODE_H / 2 }
            case 'right': return { x: nodePos.x + NODE_W, y: nodePos.y + NODE_H / 2 }
        }
    }

    const getBestPorts = (fromId: string, toId: string) => {
        const a = getPos(fromId), b = getPos(toId)
        let fs: any = 'right', ts: any = 'left'
        if (b.x > a.x + NODE_W + 40) { fs = 'right'; ts = 'left' }
        else if (b.x < a.x - 40) { fs = 'left'; ts = 'right' }
        else if (b.y > a.y + NODE_H) { fs = 'bottom'; ts = 'top' }
        else { fs = 'top'; ts = 'bottom' }
        return { from: getPortPos(a, fs), to: getPortPos(b, ts), fs, ts }
    }

    const edgePath = (fromId: string, toId: string) => {
        const { from, to, fs, ts } = getBestPorts(fromId, toId)
        const dx = Math.abs(from.x - to.x) * 0.5
        const dy = Math.abs(from.y - to.y) * 0.5

        let c1 = { x: from.x, y: from.y }, c2 = { x: to.x, y: to.y }
        if (fs === 'right') c1.x += dx; else if (fs === 'left') c1.x -= dx; else if (fs === 'bottom') c1.y += dy; else c1.y -= dy
        if (ts === 'right') c2.x += dx; else if (ts === 'left') c2.x -= dx; else if (ts === 'bottom') c2.y += dy; else c2.y -= dy

        return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`
    }

    const pendingPath = (fromId: string, side: 'top' | 'bottom' | 'left' | 'right') => {
        if (!pendingLine) return ''
        const from = getPortPos(getPos(fromId), side)
        const dx = Math.abs(from.x - pendingLine.x) * 0.5
        const dy = Math.abs(from.y - pendingLine.y) * 0.5
        let c1 = { x: from.x, y: from.y }
        if (side === 'right') c1.x += dx; else if (side === 'left') c1.x -= dx; else if (side === 'bottom') c1.y += dy; else c1.y -= dy

        // If snapped to a magnetic node, use the target side logic for C2 curvature
        // For now, simplicity is better for pending lines
        return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${pendingLine.x} ${pendingLine.y}, ${pendingLine.x} ${pendingLine.y}`
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        let data = e.dataTransfer.getData('application/json')
        if (!data) data = e.dataTransfer.getData('text/plain')
        if (!data) return

        try {
            const parsed = JSON.parse(data)
            // handle string or object payload depending on browser quirk
            const id = typeof parsed === 'string' ? JSON.parse(parsed).id : parsed.id
            const type = typeof parsed === 'string' ? JSON.parse(parsed).type : parsed.type

            const rect = containerRef.current?.getBoundingClientRect()
            if (rect && id && type) {
                const x = (e.clientX - rect.left - pan.x) / zoom - (NODE_W / 2)
                const y = (e.clientY - rect.top - pan.y) / zoom - 20
                onDropNode(id, type, x, y)
            }
        } catch (err) {
            console.error('Canvas drop error:', err)
        }
    }

    return (
        <div className="relative w-full flex-1 bg-[#f7f7f7] overflow-hidden select-none"
            style={{ backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)', backgroundSize: '28px 28px' }}
            ref={containerRef}
            onMouseDown={onBgMouseDown}
            onDragEnter={e => e.preventDefault()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-node]')) return
                const rect = containerRef.current?.getBoundingClientRect()
                if (rect) {
                    const x = (e.clientX - rect.left - pan.x) / zoom
                    const y = (e.clientY - rect.top - pan.y) / zoom
                    onCreateNode({ title: 'New Idea', x, y })
                }
            }}
            onClick={connectingFrom ? cancelConnect : undefined}
        >
            {/* Controls */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                <div className="flex flex-col bg-white border border-black/[0.08] rounded-xl shadow-lg overflow-hidden">
                    <div className="relative flex items-center">
                        <ControlTooltip label="Zoom In" id="zoom-in" />
                        <button
                            onClick={() => setZoom(z => Math.min(z + 0.15, 2.5))}
                            onMouseEnter={() => setHoveredControl('zoom-in')}
                            onMouseLeave={() => setHoveredControl(null)}
                            className="w-8 h-8 flex items-center justify-center text-black/40 hover:text-black/70 hover:bg-black/[0.02] transition-all"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-px bg-black/[0.04]" />
                    <div className="relative flex items-center">
                        <ControlTooltip label="Zoom Out" id="zoom-out" />
                        <button
                            onClick={() => setZoom(z => Math.max(z - 0.15, 0.3))}
                            onMouseEnter={() => setHoveredControl('zoom-out')}
                            onMouseLeave={() => setHoveredControl(null)}
                            className="w-8 h-8 flex items-center justify-center text-black/40 hover:text-black/70 hover:bg-black/[0.02] transition-all"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="relative flex items-center">
                    <ControlTooltip label="Reset View" id="reset" />
                    <button
                        onClick={() => { setPan({ x: 60, y: 60 }); setZoom(1) }}
                        onMouseEnter={() => setHoveredControl('reset')}
                        onMouseLeave={() => setHoveredControl(null)}
                        className="w-8 h-8 bg-white border border-black/[0.08] rounded-xl flex items-center justify-center text-black/40 hover:text-black/70 shadow-sm transition-all"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="relative flex items-center">
                    <ControlTooltip label="Auto-arrange" id="arrange" />
                    <button
                        onClick={autoArrange}
                        onMouseEnter={() => setHoveredControl('arrange')}
                        onMouseLeave={() => setHoveredControl(null)}
                        className="w-8 h-8 bg-white border border-black/[0.08] rounded-xl flex items-center justify-center text-black/40 hover:text-black/70 shadow-sm transition-all"
                    >
                        <Shuffle className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="h-px bg-black/[0.06] my-1" />

                <div className="relative flex items-center">
                    <ControlTooltip label="New Idea" id="new" />
                    <button
                        onClick={() => {
                            const rect = containerRef.current?.getBoundingClientRect()
                            if (rect) {
                                onCreateNode({ title: 'New Idea', x: (40 - pan.x) / zoom, y: (40 - pan.y) / zoom })
                            }
                        }}
                        onMouseEnter={() => setHoveredControl('new')}
                        onMouseLeave={() => setHoveredControl(null)}
                        className="w-8 h-8 bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-600 shadow-lg transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Status hint */}
            {connectingFrom && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-black text-white text-[11px] font-bold rounded-xl shadow-xl animate-in fade-in duration-150">
                    Click another idea to connect · Esc to cancel
                </div>
            )}

            {/* Zoom/Pan container */}
            <div
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', width: '100%', height: '100%' }}
            >
                {/* SVG edges layer */}
                <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%' }}>
                    {/* Existing connections */}
                    {connections.map(conn => (
                        <g key={conn.id}>
                            {/* Wider hit area */}
                            <path
                                d={edgePath(conn.from_id, conn.to_id)}
                                stroke="transparent"
                                strokeWidth={14}
                                fill="none"
                                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredEdge(conn.id)}
                                onMouseLeave={() => setHoveredEdge(null)}
                                onClick={(e) => { e.stopPropagation(); onDeleteConnection(conn.id) }}
                            />
                            <path
                                d={edgePath(conn.from_id, conn.to_id)}
                                stroke={hoveredEdge === conn.id ? '#ef4444' : '#9ca3af'}
                                strokeWidth={hoveredEdge === conn.id ? 2 : 1.5}
                                strokeDasharray={hoveredEdge === conn.id ? '4 3' : undefined}
                                fill="none"
                                opacity={0.7}
                                style={{ pointerEvents: 'none' }}
                            />
                        </g>
                    ))}
                    {/* Pending (in-progress) connection */}
                    {connectingFrom && pendingLine && (
                        <path
                            d={pendingPath(connectingFrom.id, connectingFrom.side)}
                            stroke="#6366f1"
                            strokeWidth={1.5}
                            strokeDasharray="5 4"
                            fill="none"
                            opacity={0.8}
                            style={{ pointerEvents: 'none' }}
                        />
                    )}
                </svg>

                {/* Nodes */}
                {entries.map(node => {
                    const pos = getPos(node.id)
                    const isConnecting = connectingFrom?.id === node.id
                    const isHovered = hoveredNode === node.id
                    const connCount = connections.filter(c => c.from_id === node.id || c.to_id === node.id).length

                    const color = (node as any).color || 'default'
                    const body = (node as any).body || (node as any).description || (node as any).notes || (node as any).tagline || ''
                    const icon = node.node_type === 'project' ? <Rocket className="w-3 h-3 text-orange-500" /> : node.node_type === 'content' ? <Video className="w-3 h-3 text-blue-500" /> : null

                    return (
                        <div
                            key={node.id}
                            data-node="1"
                            style={{ position: 'absolute', left: pos.x, top: pos.y, width: NODE_W, paddingTop: 20, paddingBottom: 40, marginTop: -20 }}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseMove={e => onNodeMouseMove(e, node.id)}
                            onMouseLeave={() => { setHoveredNode(null); setHoverSide('right') }}
                            onMouseDown={e => onNodeMouseDown(e, node.id)}
                            onClick={e => handleNodeClick(e, node)}
                        >
                            <div className={cn(
                                "bg-white border rounded-2xl px-3.5 py-3 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-150 relative",
                                node.node_type === 'project' ? "border-orange-200" : node.node_type === 'content' ? "border-blue-200" : COLOR_BORDER[color as CanvasColor],
                                (draggingId === node.id || animatingRemovalId === node.id) && 'opacity-0 pointer-events-none',
                                !!connectingFrom && connectingFrom.id === node.id && 'ring-2 ring-indigo-400 shadow-md',
                                selectedIds.includes(node.id) && 'ring-2 ring-indigo-500 shadow-xl border-indigo-500 z-50',
                                isHovered && !connectingFrom && draggingId !== node.id && 'shadow-md',
                                (connectingFrom && connectingFrom.id !== node.id && magneticNode === node.id) && 'ring-4 ring-indigo-500/30 scale-[1.02] shadow-xl z-50',
                                connectingFrom && connectingFrom.id !== node.id && !magneticNode && 'hover:ring-2 hover:ring-indigo-300'
                            )}
                                style={{ height: NODE_H }}
                            >
                                <div className="flex flex-col h-full">
                                    <div className="flex items-start gap-2">
                                        {node.node_type === 'entry' ? (
                                            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", COLOR_DOT[color as CanvasColor])} />
                                        ) : (
                                            <div className="shrink-0 mt-0.5">{icon}</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-black leading-tight line-clamp-1">{node.title}</p>
                                        </div>
                                        {/* Image thumbnail */}
                                        {(node as any).images?.[0] || (node as any).cover_url ? (
                                            <img src={(node as any).images?.[0] || (node as any).cover_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/[0.06]" />
                                        ) : null}
                                    </div>

                                    <div className="flex-1 min-w-0 mt-2">
                                        {body ? (
                                            <p className="text-[10px] text-black/50 leading-relaxed line-clamp-3">{body}</p>
                                        ) : (
                                            <p className="text-[10px] text-black/20 italic">No notes...</p>
                                        )}
                                    </div>

                                    {node.node_type !== 'entry' && (
                                        <div className="mt-auto mb-1">
                                            <span className={cn(
                                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                                                node.node_type === 'project' ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"
                                            )}>
                                                {(node as any).status || node.node_type}
                                            </span>
                                        </div>
                                    )}

                                    {connCount > 0 && (
                                        <div className="flex items-center gap-1 mt-auto overflow-hidden">
                                            <div className="h-px bg-black/[0.05] flex-1" />
                                            <p className="text-[8px] text-black/30 font-bold uppercase tracking-widest shrink-0">{connCount} links</p>
                                            <div className="h-px bg-black/[0.05] flex-1" />
                                        </div>
                                    )}
                                </div>

                                {/* Connection Handle - Dynamic */}
                                {(isHovered || magneticNode === node.id) && !draggingId && (!connectingFrom || magneticNode === node.id) && (
                                    <div
                                        data-handle={hoverSide}
                                        onMouseDown={e => startConnect(e, node.id, hoverSide)}
                                        className={cn(
                                            "absolute w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center cursor-crosshair hover:scale-125 transition-all shadow-lg z-20 border-2 border-white",
                                            hoverSide === 'top' && "-top-2.5 left-1/2 -translate-x-1/2",
                                            hoverSide === 'bottom' && "-bottom-2.5 left-1/2 -translate-x-1/2",
                                            hoverSide === 'left' && "-left-2.5 top-1/2 -translate-y-1/2",
                                            hoverSide === 'right' && "-right-2.5 top-1/2 -translate-y-1/2"
                                        )}
                                        title="Click and drag to connect"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </div>
                                )}
                            </div>

                            {/* Hover actions: Open + Archive + Delete */}
                            {isHovered && !connectingFrom && draggingId !== node.id && (
                                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={e => { e.stopPropagation(); onNodeClick(node) }}
                                        className="h-7 px-2.5 bg-black text-white text-[9px] font-black rounded-lg shadow-md hover:scale-110 active:scale-95 transition-all flex items-center gap-1"
                                        onMouseDown={e => e.stopPropagation()}
                                    >
                                        <ArrowUpRight className="w-3 h-3" />
                                        OPEN
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); onRemoveNode(node.id) }} className="w-7 h-7 bg-white text-black/40 rounded-lg flex items-center justify-center hover:bg-neutral-800 hover:text-white hover:scale-110 active:scale-95 transition-all border border-black/5 shadow-sm hover:shadow-black/20" title="Remove from Map" onMouseDown={e => e.stopPropagation()}>
                                        <X className="w-3 h-3" />
                                    </button>
                                    {node.node_type === 'entry' && (
                                        <>
                                            <button onClick={e => { e.stopPropagation(); onArchiveNode(node.id) }} className="w-7 h-7 bg-white text-black/40 rounded-lg flex items-center justify-center hover:bg-amber-500 hover:text-white hover:scale-110 active:scale-95 transition-all border border-black/5 shadow-sm hover:shadow-amber-500/20" title="Archive Permanently" onMouseDown={e => e.stopPropagation()}>
                                                <Archive className="w-3 h-3" />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); onDeleteNode(node.id) }} className="w-7 h-7 bg-white text-black/40 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white hover:scale-110 active:scale-95 transition-all border border-black/5 shadow-sm hover:shadow-red-500/20" title="Delete Permanently" onMouseDown={e => e.stopPropagation()}>
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Dragging/Animating Portal */}
            {(draggingId || animatingRemovalId) && typeof document !== 'undefined' && createPortal(
                (() => {
                    const activeId = animatingRemovalId || draggingId
                    if (!activeId) return null
                    const node = entries.find(n => n.id === activeId)
                    if (!node) return null
                    const color = (node as any).color || 'default'
                    const body = (node as any).body || (node as any).description || (node as any).notes || (node as any).tagline || ''
                    const icon = node.node_type === 'project' ? <Rocket className="w-3 h-3 text-orange-500" /> : node.node_type === 'content' ? <Video className="w-3 h-3 text-blue-500" /> : null

                    const isAnimating = !!animatingRemovalId
                    const x = isAnimating ? removalTarget?.x : ghostCoords?.x
                    const y = isAnimating ? removalTarget?.y : ghostCoords?.y

                    return (
                        <div
                            style={{
                                position: 'fixed',
                                left: x,
                                top: y,
                                width: NODE_W,
                                zIndex: 9999,
                                pointerEvents: 'none',
                                transform: isAnimating
                                    ? `translate(-50%, -50%) scale(0.05) rotate(-20deg)`
                                    : isOverLibrary
                                        ? `translate(-50%, -50%) rotate(0deg) scale(0.9)`
                                        : `translate(-50%, -50%) rotate(1deg) scale(1.05)`,
                                transition: isAnimating
                                    ? 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s',
                                opacity: isAnimating ? 0 : (isOverLibrary ? 1 : 0.95)
                            }}
                        >
                            <div className={cn(
                                "bg-white border-2 rounded-2xl px-3.5 py-3 shadow-2xl transition-all duration-200",
                                isOverLibrary
                                    ? "border-indigo-500 bg-white ring-8 ring-indigo-500/10 shadow-indigo-500/20"
                                    : (node.node_type === 'project' ? "border-orange-200" : node.node_type === 'content' ? "border-blue-200" : COLOR_BORDER[color as CanvasColor])
                            )}>
                                <div className="flex flex-col">
                                    <div className="flex items-start gap-2">
                                        {node.node_type === 'entry' ? (
                                            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", COLOR_DOT[color as CanvasColor])} />
                                        ) : (
                                            <div className="shrink-0 mt-0.5">{icon}</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-black leading-tight line-clamp-1">{node.title}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 mt-2">
                                        <p className="text-[10px] text-black/50 leading-relaxed line-clamp-2">{body}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })(),
                document.body
            )}

            {/* Compose Button overlay */}
            {selectedIds.length > 0 && onCompose && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 duration-300">
                    <button
                        onClick={() => onCompose(entries.filter(e => selectedIds.includes(e.id)))}
                        className="flex items-center gap-2.5 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
                    >
                        <BookOpen className="w-4 h-4" />
                        Compose Draft ({selectedIds.length})
                    </button>
                </div>
            )}

            {/* Marquee Box */}
            {marqueeBox && (
                <div
                    className="fixed border-2 border-indigo-500 bg-indigo-500/10 z-[1000] pointer-events-none rounded-sm"
                    style={{
                        left: marqueeBox.x1,
                        top: marqueeBox.y1,
                        width: marqueeBox.x2 - marqueeBox.x1,
                        height: marqueeBox.y2 - marqueeBox.y1
                    }}
                />
            )}

            {/* Empty state */}
            {entries.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-[13px] text-black/20 font-medium">Add ideas in Board view to see them here</p>
                </div>
            )}
        </div>
    )
}
