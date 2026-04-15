# Schro (Schrö) — Application Documentation

Schro (internally referred to as **Schrö**) is a high-performance, personal and business operating system designed for meticulous life management, strategic planning, and AI-driven insights. It combines transactional utility with high-level intelligence across multiple domains.

---

## 🏗️ System Architecture

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19) — Utilising App Router for robust routing and server components.
- **Desktop Environment**: [Tauri](https://tauri.app/) — Provides a lightweight, high-performance desktop wrapper with native system access.
- **Database & Auth**: [Supabase](https://supabase.com/) — Multi-tenant PostgreSQL with Row Level Security (RLS) for data isolation and secure authentication.
- **AI Engine**: [Google Gemini](https://deepmind.google/technologies/gemini/) — Powers the Intelligence module and smart features like Task Priority suggestions and Daily Briefs.
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/) — State-of-the-art styling and micro-animations for a premium UX.
- **Rich Text**: [Tiptap](https://tiptap.dev/) — headless editor for rich notes and clipboard assets.

---

## 🛰️ Global Systems

### 🛡️ App Shell & Navigation
The core UI is wrapped in an `AppShell` featuring a dynamic, reorderable **Sidebar**. The navigation structure is managed via a single source of truth (`navConfig.ts`), ensuring UI consistency across the desktop and web environments.

### 🎭 Multitasking (Split View)
One of the core OS features is the native **Split View** multitasking system.
- **Dual Panes**: Allows two independent modules to run side-by-side (e.g., Tasks next to Intelligence).
- **Resizable Handle**: A central divider allows for custom screen distribution.
- **Context Awareness**: Focused panes are highlighted, and a dedicated `FloatingModulePicker` allows for rapid navigation within a specific pane.
- **Minimal UI Protocol**: Panes automatically switch to a "Minimal UI" state, hiding redundant sidebar and navigation elements to maximise workspace.

### ⚡ Global Quick Action (GQA)
A ubiquitous, high-speed entry hub (floating button) that allows users to capture data instantly without navigating away from their current context.
- **Tasks**: Rapid entry for Todo, Reminders, and Groceries.
- **Vault**: Immediate asset transfer to the global clipboard.
- **Mood**: Emotional state logging with activity cross-referencing.
- **Canvas/Notes**: Quick captures for R&D notes or articles.
- **Wellbeing**: Fast logging for gym routines and meal consumption.

### 🔐 Security & Privacy
- **Vault Lock**: A dedicated PIN-protected layer for sensitive data (Clipboard/Secrets).
- **Privacy Mode**: Global toggle to blur sensitive financial or personal data.
- **Desktop Persistence**: Custom hooks ensure session longevity and automatic token refreshing within the Tauri environment.

---

## 📦 Module Deep-Dive

### 🏎️ Control Centre
The "System Core" for daily monitoring.
- **Engine Velocity**: A real-time efficiency gauge calculating productivity based on financial health and task completion.
- **Morning Pulse**: AI-generated daily briefing of schedule, priority tasks, and weather.
- **Performance Visualizer**: Aggregated life metrics across all modules.

### 🛠️ Operations (Tasks)
The execution engine of Schrö.
- **Day Planner**: An algorithmic timeline that schedules tasks, routines, and rest based on work shifts and personal defaults.
- **Focus Map (Matrix)**: A spatial X/Y grid for visualising task impact vs. time horizon.
- **Deployment**: Traditional todo lists with recurring rules and AI-suggested priorities.
- **Distance Matrix**: Integration with Google Maps to auto-calculate travel time between task locations.

### 🧠 Intelligence
A neural interaction hub powered by Gemini.
- **Personas**: Directed AI assistants (Ruby for Wellbeing, Vance for Strategy, Kael for Technical).
- **Neural Voice**: Real-time voice interaction with HD cloud voices and auto-send capabilities.
- **Access Control**: Granular permissions allowing the AI to query system-wide data (Finances, Goals, Drive, etc.).
- **Identity DNA**: Allows the assistant to learn the user's specific axioms and strategic directives.

### 💰 Finances
A full-featured financial operating system.
- **Multi-Profile**: Independent tracking for Personal and Business entities.
- **Projections**: Advanced forecasting based on upcoming bills, recurring income, and rota patterns.
- **Pot Management**: Logical "Pockets" for savings goals and liability tracking.

### ✨ Studio (Create)
Research, development, and portfolio management.
- **Projects**: Milestone-based tracking for creative and strategic initiatives.
- **Canvas**: A spatial whiteboard system for connecting ideas and projects.
- **Content Hub**: Management for social media production across YouTube, Instagram, and more.

### 🎯 Manifest (Goals)
Long-term intentionality tracking.
- **Targets**: Rigid strategic goals linked to operational tasks.
- **Dreams & Wishlist**: High-level aspirations and material intentions.

### 💚 Wellbeing (Health)
Physical and mental optimization.
- **Fitness**: Detailed workout logging with routine libraries (Push/Pull/Legs).
- **Nutrition**: Macro tracking with "Fridge" inventory and meal library integration.
- **Mind**: Habit tracking and mental health check-ins.

---

## 🚫 Abandoned / Legacy Note
*The following features/components are documented only for archival clarity and are NOT part of the active user experience:*
- Root-level scripts (e.g., `test-ai.js`, `measure.js`) are development utilities and not production features.
- Any modules previously marked as "Coming Soon" or "Disabled" in legacy docs (Studio, Wellbeing) are now **fully active** and integrated.
