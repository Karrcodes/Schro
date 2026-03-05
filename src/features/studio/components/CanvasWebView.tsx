'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Shuffle, ArrowUpRight, Archive, Trash2, Plus, Rocket, Video, X } from 'lucide-react'
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
    onCreateNode: (data: { title: string; x: number; y: number }) => void
}

export default function CanvasWebView({
    entries, connections, onNodeClick, onCreateConnection, onDeleteConnection, onUpdatePosition,
    onDeleteNode, onArchiveNode, onCreateNode
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

    const dragStart = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null)
    const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
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

    // ---- Pan (background drag) ----
    const onBgMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return
        if ((e.target as HTMLElement).closest('[data-node]')) return
        isPanning.current = true
        panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
    }

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (draggingId && dragStart.current) {
            const dx = (e.clientX - dragStart.current.mx) / zoom
            const dy = (e.clientY - dragStart.current.my) / zoom
            const nx = dragStart.current.nx + dx
            const ny = dragStart.current.ny + dy
            setPositions(prev => ({ ...prev, [draggingId]: { x: nx, y: ny } }))
        } else if (isPanning.current && panStart.current) {
            setPan({
                x: panStart.current.px + (e.clientX - panStart.current.mx),
                y: panStart.current.py + (e.clientY - panStart.current.my),
            })
        }

        if (connectingFrom) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect) {
                const mx = (e.clientX - rect.left - pan.x) / zoom
                const my = (e.clientY - rect.top - pan.y) / zoom
                setPendingLine({ x: mx, y: my })

                // Magnetic Proximity Detection
                let closest: string | null = null
                let minD = 50 // Pixels proximity

                entries.forEach(node => {
                    if (node.id === connectingFrom.id) return
                    const p = getPos(node.id)
                    const dx = mx - (p.x + NODE_W / 2)
                    const dy = my - (p.y + NODE_H / 2)
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < minD) {
                        minD = dist
                        closest = node.id
                    }
                })
                setMagneticNode(closest)
            }
        }
    }, [draggingId, zoom, connectingFrom, pan, entries, getPos])

    const onMouseUp = useCallback((e: React.MouseEvent) => {
        if (draggingId) {
            const pos = positions[draggingId]
            if (pos) onUpdatePosition(draggingId, pos.x, pos.y)
        }
        if (connectingFrom && magneticNode) {
            onCreateConnection(connectingFrom.id, magneticNode)
            setConnectingFrom(null)
            setPendingLine(null)
            setMagneticNode(null)
        }
        setDraggingId(null)
        dragStart.current = null
        isPanning.current = false
        panStart.current = null
        // If we were connecting but didn't hit a node, we might want to keep it or cancel
        // Keeping it for click-to-connect for now, but clearing magnetic
        setMagneticNode(null)
    }, [draggingId, positions, onUpdatePosition, connectingFrom, magneticNode, onCreateConnection])

    // ---- Node interaction ----
    const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (connectingFrom || (e.target as HTMLElement).closest('[data-handle]')) return
        setDraggingId(id)
        const pos = getPos(id)
        dragStart.current = { mx: e.clientX, my: e.clientY, nx: pos.x, ny: pos.y }
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
        return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${pendingLine.x} ${pendingLine.y}, ${pendingLine.x} ${pendingLine.y}`
    }

    return (
        <div className="relative w-full flex-1 bg-[#f7f7f7] overflow-hidden select-none"
            style={{ backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)', backgroundSize: '28px 28px' }}
            ref={containerRef}
            onMouseDown={onBgMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
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
                                draggingId === node.id && 'shadow-2xl ring-2 ring-black/10 scale-105 rotate-1 z-[100] cursor-grabbing',
                                !!connectingFrom && connectingFrom.id === node.id && 'ring-2 ring-indigo-400 shadow-md',
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
                                    {node.node_type === 'entry' && (
                                        <>
                                            <button onClick={e => { e.stopPropagation(); onArchiveNode(node.id) }} className="w-7 h-7 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center hover:bg-amber-100 hover:scale-110 active:scale-95 transition-all border border-amber-200" title="Archive" onMouseDown={e => e.stopPropagation()}>
                                                <Archive className="w-3 h-3" />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); onDeleteNode(node.id) }} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 hover:scale-110 active:scale-95 transition-all border border-red-200" title="DeletePermanently" onMouseDown={e => e.stopPropagation()}>
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                    {node.node_type !== 'entry' && (
                                        <button onClick={e => { e.stopPropagation(); onDeleteNode(node.id) }} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 hover:scale-110 active:scale-95 transition-all border border-red-200" title="Remove from Map" onMouseDown={e => e.stopPropagation()}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Empty state */}
            {entries.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-[13px] text-black/20 font-medium">Add ideas in Board view to see them here</p>
                </div>
            )}
        </div>
    )
}
