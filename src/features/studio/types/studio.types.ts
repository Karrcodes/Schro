export type ProjectStatus = 'idea' | 'research' | 'active' | 'paused' | 'shipped' | 'archived';
export type ProjectType = 'Architectural Design' | 'Technology' | 'Fashion' | 'Product Design' | 'Media' | 'Other';
export type Platform = 'youtube' | 'instagram' | 'substack' | 'tiktok' | 'x' | 'web';
export type PriorityLevel = 'super' | 'high' | 'mid' | 'low';
export type ContentCategory = 'Vlog' | 'Thoughts' | 'Showcase' | 'Concept' | 'Update' | 'Other';

export interface StudioProject {
    id: string;
    title: string;
    tagline?: string;
    description?: string;
    status: ProjectStatus;
    type?: ProjectType;
    platforms?: Platform[];
    cover_url?: string;
    gtv_featured: boolean;
    gtv_category?: 'innovation' | 'impact' | 'recognition' | 'leadership';
    start_date?: string | null;
    target_date?: string | null;
    priority?: PriorityLevel;
    impact?: PriorityLevel;
    impact_score?: number;
    strategic_category?: string;
    ai_position_x?: number;
    ai_position_y?: number;
    is_promoted?: boolean;
    is_archived?: boolean;
    created_at: string;
    updated_at: string;
}

export type SparkType = 'tool' | 'resource' | 'event';
export type SparkStatus = 'inbox' | 'review' | 'utilized' | 'discarded';

export interface StudioSpark {
    id: string;
    type: SparkType;
    title: string;
    url?: string;
    notes?: string;
    tags?: string[];
    project_id?: string;
    price?: number;
    icon_url?: string;
    status: SparkStatus;
    created_at: string;
    updated_at: string;
}

export type ContentStatus = 'idea' | 'scripted' | 'filmed' | 'edited' | 'scheduled' | 'published';

export interface ContentScene {
    id: string;
    location: string;
    type: 'public' | 'private';
    cost?: string;
    distance?: string;
}

export interface StudioContent {
    id: string;
    project_id?: string | null;
    platforms: Platform[];
    type?: string;
    category?: ContentCategory;
    title: string;
    status: ContentStatus;
    priority?: PriorityLevel;
    impact?: PriorityLevel;
    impact_score?: number;
    publish_date?: string | null;
    deadline?: string | null;
    url?: string;
    notes?: string;
    script?: string;
    cover_url?: string;
    is_archived?: boolean;
    scenes?: ContentScene[];
    created_at: string;
    updated_at: string;
}

export type PressType = 'competition' | 'grant' | 'award' | 'feature' | 'accelerator' | 'other';
export type PressStatus = 'not_started' | 'applying' | 'submitted' | 'achieved' | 'lost' | 'closed' | 'published' | 'rejected';

export interface StudioPress {
    id: string;
    title: string;
    organization: string;
    type: PressType;
    status: PressStatus;
    requirements?: string;
    deadline?: string | null;
    date_achieved?: string | null;
    url?: string;
    notes?: string;
    milestone_goal?: string;
    is_strategy_goal: boolean;
    is_portfolio_item: boolean;
    is_archived?: boolean;
    is_pinned?: boolean;
    gtv_category?: 'innovation' | 'impact' | 'recognition' | null;
    project_id?: string | null;
    created_at: string;
    updated_at: string;
}

export type NetworkType = 'person' | 'community' | 'event';
export type NetworkStatus = 'interested' | 'contacted' | 'connected' | 'attending' | 'attended';

export interface StudioNetwork {
    id: string;
    type: NetworkType;
    name: string;
    platform?: string;
    url?: string;
    notes?: string;
    status: NetworkStatus;
    category?: string;
    event_date?: string;
    last_contact?: string;
    tags?: string[];
    created_at: string;
    updated_at: string;
}

export interface StudioMilestone {
    id: string;
    project_id?: string;
    spark_id?: string;
    content_id?: string;
    title: string;
    description?: string;
    status: 'pending' | 'completed';
    completed_at?: string | null;
    target_date?: string | null;
    category?: string;
    impact_score?: number;
    priority?: PriorityLevel;
    linked_task_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectMatrixProps {
    searchQuery?: string;
    filterType?: string | null;
    showArchived?: boolean;
}

export interface ProjectTimelineProps {
    onProjectClick: (project: StudioProject) => void;
    searchQuery?: string;
    filterType?: string | null;
    showArchived?: boolean;
    sortBy?: 'priority' | 'impact' | 'date';
}
export interface ProjectKanbanProps {
    searchQuery?: string;
    filterType?: string | null;
    showArchived?: boolean;
    sortBy?: 'priority' | 'impact' | 'date';
}

// Canvas
export type CanvasColor = 'default' | 'yellow' | 'blue' | 'green' | 'purple' | 'red';

export interface StudioCanvasEntry {
    id: string;
    title: string;
    body?: string;
    tags?: string[];
    color: CanvasColor;
    pinned: boolean;
    is_archived?: boolean;
    images?: string[];
    promoted_to_spark_id?: string | null;
    web_x?: number | null;
    web_y?: number | null;
    created_at: string;
    updated_at: string;
}

export interface CanvasConnection {
    id: string;
    map_id?: string; // Scoped to a specific mindmap
    from_id: string;
    to_id: string;
    label?: string;
    created_at: string;
}

export interface CanvasMap {
    id: string;
    name: string;
    user_id: string;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface CanvasMapNode {
    id: string;
    map_id: string;
    entry_id?: string | null;
    project_id?: string | null;
    content_id?: string | null;
    x: number;
    y: number;
    created_at: string;
}

export type PolymorphicNode = (StudioCanvasEntry | StudioProject | StudioContent) & {
    web_x?: number | null;
    web_y?: number | null;
    node_type: 'entry' | 'project' | 'content';
}

export interface NodeReference {
    node_id: string;
    node_type: 'entry' | 'project' | 'content';
    text_offset?: number;
    text_length?: number;
}

export interface StudioDraft {
    id: string;
    project_id?: string;
    content_id?: string | null;
    title: string;
    body: string;
    node_references: NodeReference[];
    status: 'draft' | 'revision' | 'completed';
    is_archived: boolean;
    pinned?: boolean;
    last_snapshot_at: string;
    created_at: string;
    updated_at: string;
}

