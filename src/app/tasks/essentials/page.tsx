'use client'

import { TasksLayout } from '@/features/tasks/components/TasksLayout'
import { TaskList } from '@/features/tasks/components/TaskList'

export default function EssentialsPage() {
    return (
        <TasksLayout>
            <TaskList category="essential" />
        </TasksLayout>
    )
}
