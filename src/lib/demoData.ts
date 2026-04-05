export const MOCK_FINANCE = {
    pockets: [
        { id: 'd-p-1', name: 'General Account', target_budget: 2000, target_amount: 0, balance: 842.50, current_balance: 842.50, type: 'general', sort_order: 1, profile: 'personal' },
        { id: 'd-p-2', name: 'Living & Bills', target_budget: 1200, target_amount: 0, balance: 420.20, current_balance: 420.20, type: 'general', sort_order: 2, profile: 'personal' },
        { id: 'd-p-3', name: 'Subscriptions', target_budget: 100, target_amount: 0, balance: 45.00, current_balance: 45.00, type: 'general', sort_order: 3, profile: 'personal' },
        { id: 'd-p-4', name: 'Liabilities Buffer', target_budget: 1000, target_amount: 0, balance: 650.00, current_balance: 650.00, type: 'buffer', sort_order: 4, profile: 'personal' },
        { id: 'd-p-5', name: 'Emergency Fund', target_budget: 5000, target_amount: 0, balance: 1200.00, current_balance: 1200.00, type: 'savings', sort_order: 5, profile: 'personal' },
        { id: 'd-p-6', name: 'Travel Savings', target_budget: 2000, target_amount: 0, balance: 350.00, current_balance: 350.00, type: 'savings', sort_order: 6, profile: 'personal' },
    ],
    obligations: [
        { id: 'd-o-2', name: 'Council Tax', amount: 145, frequency: 'monthly', due_day: 15 },
        { id: 'd-o-3', name: 'Utility Bill', amount: 120, frequency: 'monthly', due_day: 20 },
        { id: 'd-o-4', name: 'Broadband', amount: 35, frequency: 'monthly', due_day: 12 },
        { id: 'd-o-5', name: 'Gym Membership', amount: 45, frequency: 'monthly', due_day: 5 },
        { id: 'd-o-6', name: 'Education Loan', amount: 120, frequency: 'monthly', due_day: 28, payments_left: 24 },
        { id: 'd-o-7', name: 'Equipment Finance', amount: 115, frequency: 'monthly', due_day: 25, payments_left: 12 },
        { id: 'd-o-8', name: 'Netflix', amount: 15.99, frequency: 'monthly', due_day: 10 },
        { id: 'd-o-9', name: 'Spotify', amount: 10.99, frequency: 'monthly', due_day: 18 },
        { id: 'd-o-10', name: 'Adobe Creative Cloud', amount: 52.00, frequency: 'monthly', due_day: 22 },
    ],
    income: {
        raw: 750.00, // Weekly gross approx
        net: 574.40, // Weekly net established by user
        label: 'Weekly Salary',
        employer: 'Work Portal'
    },
    transactions: [
        { id: 'd-tx-1', description: 'Monmouth Coffee Company', amount: 4.80, category: 'food_drink', type: 'spend', date: '2026-02-18' },
        { id: 'd-tx-2', description: 'TfL Travel Charge', amount: 8.40, category: 'transport', type: 'spend', date: '2026-02-18' },
        { id: 'd-tx-3', description: 'Waitrose Clapham', amount: 62.15, category: 'groceries', type: 'spend', date: '2026-02-17' },
        { id: 'd-tx-4', description: 'Netflix Subscription', amount: 17.99, category: 'entertainment', type: 'spend', date: '2026-02-10' },
        { id: 'd-tx-5', description: 'Lumina Digital Salary', amount: 2912.40, category: 'income', type: 'income', date: '2026-01-31' },
        { id: 'd-tx-6', description: 'Dishoom Shoreditch', amount: 78.40, category: 'food_drink', type: 'spend', date: '2026-02-14' },
        { id: 'd-tx-7', description: 'PureGym Clapham', amount: 29.99, category: 'health', type: 'spend', date: '2026-02-01' },
        { id: 'd-tx-8', description: 'Apple iCloud', amount: 8.99, category: 'other', type: 'spend', date: '2026-02-05' },
        { id: 'd-tx-9', description: 'Amazon.co.uk', amount: 34.50, category: 'shopping', type: 'spend', date: '2026-02-12' },
        { id: 'd-tx-10', description: 'TfL Travel Charge', amount: 7.20, category: 'transport', type: 'spend', date: '2026-02-15' },
        { id: 'd-tx-11', description: 'Pact Coffee Subscription', amount: 18.00, category: 'food_drink', type: 'spend', date: '2026-02-16' },
        { id: 'd-tx-12', description: 'Uniqlo Oxford St', amount: 45.00, category: 'shopping', type: 'spend', date: '2026-02-08' },
        { id: 'd-tx-13', description: 'Starbucks (Station)', amount: 4.20, category: 'food_drink', type: 'spend', date: '2026-02-19' },
        { id: 'd-tx-14', description: 'Uber Trip', amount: 15.60, category: 'transport', type: 'spend', date: '2026-02-14' },
        { id: 'd-tx-15', description: 'Boots Pharmacy', amount: 12.30, category: 'health', type: 'spend', date: '2026-02-10' },
        { id: 'd-tx-16', description: 'TfL Travel Charge', amount: 8.40, category: 'transport', type: 'spend', date: '2026-02-19' },
    ],
    goals: [
        { id: 'd-g-1', name: 'Apartment Deposit', target_amount: 50000, current_amount: 12500, deadline: '2027-12-31', category: 'housing' },
        { id: 'd-g-2', name: 'Creative Studio Upgrades', target_amount: 5000, current_amount: 1800, deadline: '2026-08-31', category: 'other' },
        { id: 'd-g-3', name: 'Tokyo Trip 2026', target_amount: 3500, current_amount: 1200, deadline: '2026-10-15', category: 'travel' },
    ]
}

export const MOCK_BUSINESS = {
    name: 'Karrtesian Media',
    pockets: [
        { id: 'd-bp-1', name: 'KM: Operational', target_budget: 2000, target_amount: 0, balance: 3450.20, current_balance: 3450.20, type: 'general', sort_order: 1, profile: 'business' },
        { id: 'd-bp-2', name: 'KM: Tax Reserve', target_budget: 10000, target_amount: 0, balance: 4120.00, current_balance: 4120.00, type: 'savings', sort_order: 2, profile: 'business' },
    ],
    transactions: [
        { id: 'd-btx-1', description: 'Client Payment: Vertex Inc', amount: 1250.00, category: 'income', type: 'income', date: '2026-02-10' },
        { id: 'd-btx-2', description: 'Client Payment: Aura Agency', amount: 800.00, category: 'income', type: 'income', date: '2026-02-05' },
        { id: 'd-btx-3', description: 'AWS Hosting Services', amount: 42.15, category: 'business', type: 'spend', date: '2026-02-01' },
        { id: 'd-btx-4', description: 'Figma Professional', amount: 12.00, category: 'business', type: 'spend', date: '2026-02-03' },
        { id: 'd-btx-5', description: 'Buffer Subscription', amount: 15.00, category: 'business', type: 'spend', date: '2026-02-05' },
        { id: 'd-btx-6', description: 'Envato Elements', amount: 28.00, category: 'business', type: 'spend', date: '2026-02-07' },
    ],
    obligations: [
        { id: 'd-bo-3', name: 'MacBook Pro Finance', amount: 115, frequency: 'monthly', due_day: 15, payments_left: 14 },
    ],
    goals: [
        { id: 'd-bg-1', name: 'Tax Reserve 2026', target_amount: 15000, current_amount: 4120, deadline: '2027-01-31', category: 'finance', profile: 'business' },
        { id: 'd-bg-2', name: 'Hardware Refresh Fund', target_amount: 5000, current_amount: 500, deadline: '2026-12-31', category: 'other', profile: 'business' },
    ]
}

export const MOCK_TASKS = {
    todo: [
        { id: 'd-t-1', title: 'Finalize Helios UI v1.2 Release Notes', priority: 'high', is_completed: false, due_date: new Date().toISOString().split('T')[0], strategic_category: 'career', profile: 'business' },
        { id: 'd-t-2', title: 'Client Workshop: Vertex Brand Evolution', priority: 'super', is_completed: false, strategic_category: 'career', profile: 'business', start_time: '10:00', estimated_duration: 120 },
        { id: 'd-t-3', title: 'Monthly Revenue Audit & Forecasting', priority: 'high', is_completed: true, strategic_category: 'finance', profile: 'business' },
        { id: 'd-t-4', title: 'Source new high-fidelity audio gear for Studio', priority: 'mid', is_completed: false, strategic_category: 'career', profile: 'business' },
        { id: 'd-t-5', title: 'Quarterly Portfolio Refresh (Photography)', priority: 'mid', is_completed: false, strategic_category: 'career', profile: 'personal' },
        { id: 'd-t-6', title: 'Morning Run (Zone 2 - 45 mins)', priority: 'mid', is_completed: true, strategic_category: 'health', profile: 'personal' },
        { id: 'd-t-7', title: 'Refactor Core Intelligence Context Builders', priority: 'super', is_completed: false, strategic_category: 'career', profile: 'business', category: 'todo' },
        { id: 'd-t-8', title: 'Prepare TechCrunch Disrupt Pitch Deck', priority: 'high', is_completed: false, strategic_category: 'career', profile: 'business', category: 'todo' },
    ],
    grocery: [
        { id: 'd-g-1', title: 'Oat Milk (Barista Edition)', amount: 'x2', priority: 'mid', is_completed: false, profile: 'personal', category: 'grocery' },
        { id: 'd-g-2', title: 'Organic Avocados', amount: 'x4', priority: 'low', is_completed: false, profile: 'personal', category: 'grocery' },
        { id: 'd-g-3', title: 'Specialty Coffee Beans (Ethiopian)', amount: 'x1', priority: 'high', is_completed: false, profile: 'personal', category: 'grocery' },
        { id: 'd-g-4', title: 'Sourdough Bread', amount: 'x1', priority: 'low', is_completed: true, profile: 'personal', category: 'grocery' },
        { id: 'd-g-5', title: 'Fresh Pasta', amount: 'x2', priority: 'mid', is_completed: false, profile: 'personal', category: 'grocery' },
    ],
    essential: [
        { id: 'd-e-1', title: 'Pimple Patches', amount: 'x1', priority: 'mid', is_completed: false, profile: 'personal', category: 'essential' },
        { id: 'd-e-2', title: 'Body Lotion', amount: 'x1', priority: 'low', is_completed: false, profile: 'personal', category: 'essential' },
    ],
    reminder: [
        { id: 'd-r-1', title: 'Submit Self-Assessment Tax Return', priority: 'super', is_completed: false, due_date: '2026-01-31', profile: 'personal', category: 'reminder' },
        { id: 'd-r-2', title: 'Renew Apartment Insurance', priority: 'high', is_completed: false, due_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], profile: 'personal', category: 'reminder' },
        { id: 'd-r-3', title: 'Quarterly review with financial advisor', priority: 'mid', is_completed: false, profile: 'personal', category: 'reminder' },
    ]
}

export const MOCK_VAULT = {
    clips: [
        { id: 'd-c-1', content: 'https://linear.app/studiokarrtesian/project/OS-CORE-Refactor', created_at: new Date().toISOString() },
        { id: 'd-c-2', content: 'API_KEY: sk-demo-8492039402934029340293402', created_at: new Date().toISOString() },
        { id: 'd-c-3', content: 'Inspiration: "The best way to predict the future is to invent it." - Alan Kay', created_at: new Date().toISOString() },
        { id: 'd-c-4', content: 'Client Meeting Notes: Lumina Digital wants highly conversational AI prompts.', created_at: new Date().toISOString() },
    ],
    secrets: [
        { id: 'd-s-1', service: 'Lumina Digital Portal', username: 'karr@karrtesian.com', password: 'demo-password-123', notes: 'Corporate access' },
        { id: 'd-s-2', service: 'Adobe Creative Cloud', username: 'karr@karrtesian.com', password: 'creative-vault-pass', notes: 'Business account' },
        { id: 'd-s-3', service: 'LinkedIn', username: 'karr@karrtesian.com', password: 'professional-network-2026', notes: 'Personal' },
        { id: 'd-s-4', service: 'Wealthfront', username: 'karr@karrtesian.com', password: 'money-growth-99', notes: 'Investment account' },
    ]
}

export const MOCK_SCHEDULE = {
    anchor: '2026-02-23', // A Monday
    type: 'work',
    daysPerWeek: 4, // Mon-Thu
    label: 'Lumina Digital Work'
}

export const MOCK_GOALS = [
    {
        id: 'd-g-1',
        title: 'Apartment Deposit',
        description: 'Save £50k for a first-time buyer deposit in South London.',
        category: 'finance',
        status: 'active',
        priority: 'super',
        timeframe: 'long',
        vision_image_url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80',
        target_date: '2027-12-31',
        created_at: '2025-01-01T00:00:00Z'
    },
    {
        id: 'd-g-2',
        title: 'Creative Studio Upgrades',
        description: 'Upgrade to a 4K multi-cam setup and soundproof the room.',
        category: 'career',
        status: 'active',
        priority: 'high',
        timeframe: 'medium',
        vision_image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
        target_date: '2026-08-31',
        created_at: '2025-06-15T00:00:00Z'
    },
    {
        id: 'd-g-3',
        title: 'Tokyo Trip 2026',
        description: 'Two-week solo photography adventure in Japan.',
        category: 'personal',
        status: 'active',
        priority: 'high',
        timeframe: 'medium',
        vision_image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
        target_date: '2026-10-15',
        created_at: '2025-09-10T00:00:00Z'
    },
    {
        id: 'd-g-4',
        title: 'Marathon Readiness',
        description: 'Run the London Marathon in under 4 hours.',
        category: 'health',
        status: 'active',
        priority: 'mid',
        timeframe: 'short',
        vision_image_url: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
        target_date: '2026-04-26',
        created_at: '2025-11-20T00:00:00Z'
    }
]

export const MOCK_ASPIRATIONS = [
    {
        id: 'd-as-1',
        title: 'Mastery of Social Agency',
        description: 'Cultivate a presence that is grounded, fearless, and deeply influential. Move through the world with absolute agency.',
        category: 'personal',
        vision_image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
        horizon: 'long',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z'
    },
    {
        id: 'd-as-2',
        title: 'Digital Sovereignty',
        description: 'Build a suite of tools and systems that grant me total independence from traditional platforms and institutions.',
        category: 'career',
        vision_image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
        horizon: 'medium',
        status: 'active',
        created_at: '2026-01-15T00:00:00Z'
    }
]


export const MOCK_MILESTONES = [
    // Apartment Deposit
    { id: 'd-m-1', goal_id: 'd-g-1', title: 'Reach £10k baseline', is_completed: true, position: 1 },
    { id: 'd-m-2', goal_id: 'd-g-1', title: 'Reach £25k (Halfway)', is_completed: false, position: 2 },
    { id: 'd-m-3', goal_id: 'd-g-1', title: 'Final £50k target', is_completed: false, position: 3 },

    // Studio Upgrades
    { id: 'd-m-4', goal_id: 'd-g-2', title: 'Sony A7S III acquisition', is_completed: true, position: 1 },
    { id: 'd-m-5', goal_id: 'd-g-2', title: 'Sound treatment panels', is_completed: true, position: 2 },
    { id: 'd-m-6', goal_id: 'd-g-2', title: 'Blackmagic ATEM Mini setup', is_completed: false, position: 3 },

    // Tokyo Trip
    { id: 'd-m-7', goal_id: 'd-g-3', title: 'Book Flights', is_completed: true, position: 1 },
    { id: 'd-m-8', goal_id: 'd-g-3', title: 'Secure accommodation (Shibuya/Kyoto)', is_completed: false, position: 2 },
    { id: 'd-m-9', goal_id: 'd-g-3', title: 'Finalize photography itinerary', is_completed: false, position: 3 },

    // Marathon
    { id: 'd-m-10', goal_id: 'd-g-4', title: 'Reach 10k sub-50min', is_completed: true, position: 1 },
    { id: 'd-m-11', goal_id: 'd-g-4', title: 'Completer Half Marathon sub-2hr', is_completed: false, position: 2 },
    { id: 'd-m-12', goal_id: 'd-g-4', title: 'Full 42km run', is_completed: false, position: 3 },

    // Mastery of Social Agency (Aspiration Milestones)
    { id: 'd-am-1', aspiration_id: 'd-as-1', title: 'Public Speaking Workshop', is_completed: true, position: 1 },
    { id: 'd-am-2', aspiration_id: 'd-as-1', title: 'Networking Event Lead', is_completed: false, position: 2 },

    // Digital Sovereignty (Aspiration Milestones)
    { id: 'd-am-3', aspiration_id: 'd-as-2', title: 'Setup Personal Server', is_completed: true, position: 1 },
    { id: 'd-am-4', aspiration_id: 'd-as-2', title: 'Migrate from Cloud Services', is_completed: false, position: 2 }
]

export const MOCK_STUDIO = {
    projects: [
        {
            id: 'd-sp-1',
            title: 'Project Helios',
            tagline: 'Solar-Powered UI Framework',
            description: 'A comprehensive design system and component library built for low-power high-efficiency displays.',
            status: 'active',
            type: 'Technology',
            platforms: ['web', 'x'],
            cover_url: 'https://images.unsplash.com/photo-1506399558188-daf6f892f764?w=800&q=80',
            gtv_featured: false,
            priority: 'high',
            created_at: new Date().toISOString()
        },
        {
            id: 'd-sp-2',
            title: 'Karrtesian Automata',
            tagline: 'Generative Motion Graphics',
            description: 'Exploring the intersection of fluid dynamics and vector mathematics in real-time browser environments.',
            status: 'active',
            type: 'Media',
            platforms: ['youtube', 'instagram'],
            cover_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
            gtv_featured: false,
            priority: 'mid',
            created_at: new Date().toISOString()
        },
        {
            id: 'd-sp-3',
            title: 'The Obsidian Library',
            tagline: 'Digital Archive System',
            description: 'A physical-digital hybrid library system for archiving 21st-century digital humanities.',
            status: 'idea',
            type: 'Architectural Design',
            platforms: ['web'],
            cover_url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80',
            gtv_featured: false,
            priority: 'low',
            created_at: new Date().toISOString()
        }
    ],
    content: [
        {
            id: 'd-sc-1',
            title: 'Why Minimalist OS Design is the Future',
            status: 'published',
            platforms: ['youtube'],
            category: 'Thoughts',
            publish_date: '2026-02-15',
            cover_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
            notes: 'Script focus: Mental clarity and cognitive load.'
        },
        {
            id: 'd-sc-2',
            title: 'Building Helios: Part 1',
            status: 'editing',
            platforms: ['youtube', 'x'],
            category: 'Showcase',
            deadline: '2026-03-10',
            cover_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
            notes: 'Technical deep dive into the shader logic.'
        }
    ],
    press: [
        {
            id: 'd-spr-1',
            title: 'Forbes 30 Under 30 nominee',
            organization: 'Forbes',
            type: 'feature',
            status: 'achieved',
            date_achieved: '2025-11-20',
            url: 'https://forbes.com',
            notes: 'Recognized for innovation in personal operating systems.'
        },
        {
            id: 'd-spr-2',
            title: 'TechCrunch Disrupt Showcase',
            organization: 'TechCrunch',
            type: 'feature',
            status: 'submitted',
            deadline: '2026-05-15',
            url: 'https://techcrunch.com',
            notes: 'Presenting the Schrö architecture.'
        }
    ],
    canvas: [
        {
            id: 'd-sce-1',
            title: 'Vision: The Transparent Layer',
            body: 'Focus on removing the abstraction between intent and execution in digital tools.',
            color: 'blue',
            pinned: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'd-sce-2',
            title: 'Resource: Shader Toy Library',
            body: 'A collection of optimized WebGL shaders for the Helios project.',
            color: 'green',
            pinned: false,
            created_at: new Date().toISOString()
        },
        {
            id: 'd-sce-3',
            title: 'Note: HSL Color Systems',
            body: 'Why HSL is superior for programmatic UI theming compared to RGB/Hex.',
            color: 'orange',
            pinned: true,
            created_at: new Date().toISOString()
        }
    ],
    maps: [
        { id: 'd-map-1', name: 'Helios Architecture', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_archived: false }
    ],
    map_nodes: [
        { id: 'dn-1', map_id: 'd-map-1', entry_id: 'd-sce-1', x: 400, y: 300 },
        { id: 'dn-2', map_id: 'd-map-1', entry_id: 'd-sce-2', x: 650, y: 450 },
        { id: 'dn-3', map_id: 'd-map-1', project_id: 'd-sp-1', x: 200, y: 150 }
    ],
    connections: [
        { id: 'dc-1', map_id: 'd-map-1', from_id: 'd-sce-1', to_id: 'd-sp-1', created_at: new Date().toISOString() },
        { id: 'dc-2', map_id: 'd-map-1', from_id: 'd-sce-2', to_id: 'd-sp-1', created_at: new Date().toISOString() }
    ],
    drafts: [
        {
            id: 'd-dr-1',
            title: 'The Future of Agentic OS',
            body: 'A deep dive into how LLMs will replace traditional file explorers and menu systems...',
            status: 'draft',
            pinned: true,
            is_archived: false,
            node_references: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 'd-dr-2',
            title: 'Helios v2: Shader-First Design',
            body: 'Technical specification for moving all UI rendering to GPU-accelerated fragments...',
            status: 'draft',
            pinned: false,
            is_archived: false,
            node_references: [{ node_id: 'd-sp-1', node_type: 'project' }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ]
}
