import type { Exercise } from '../types'

export const EXERCISES: Exercise[] = [
    // PUSH - Chest
    // PUSH - Chest
    { id: 'bench-press', name: 'Bench Press', muscleGroup: 'Chest', suggestedReps: 8, suggestedSets: 3 },
    { id: 'incline-db-press', name: 'Incline DB Press', muscleGroup: 'Chest', suggestedReps: 10, suggestedSets: 3 },
    { id: 'chest-flys', name: 'Chest Flys', muscleGroup: 'Chest', suggestedReps: 12, suggestedSets: 3 },
    { id: 'cable-fly-high', name: 'High Cable Fly', muscleGroup: 'Chest', suggestedReps: 12, suggestedSets: 3 },
    { id: 'cable-fly-low', name: 'Low Cable Fly', muscleGroup: 'Chest', suggestedReps: 12, suggestedSets: 3 },
    { id: 'single-arm-cable-press', name: 'Single Arm Cable Press', muscleGroup: 'Chest', suggestedReps: 10, suggestedSets: 3 },
    { id: 'dips-chest', name: 'Chest Dips', muscleGroup: 'Chest', suggestedReps: 8, suggestedSets: 3, isBodyweight: true },
    { id: 'pushups', name: 'Pushups', muscleGroup: 'Chest', suggestedReps: 15, suggestedSets: 3, isBodyweight: true },
    
    // PUSH - Shoulders
    { id: 'overhead-press', name: 'Overhead Press', muscleGroup: 'Shoulders', suggestedReps: 8, suggestedSets: 3 },
    { id: 'lateral-raise', name: 'Lateral Raises', muscleGroup: 'Shoulders', suggestedReps: 15, suggestedSets: 3 },
    { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', suggestedReps: 15, suggestedSets: 3 },
    { id: 'cable-front-raise', name: 'Cable Front Raise', muscleGroup: 'Shoulders', suggestedReps: 12, suggestedSets: 3 },
    { id: 'cable-rear-delt-fly', name: 'Cable Rear Delt Fly', muscleGroup: 'Shoulders', suggestedReps: 15, suggestedSets: 3 },
    { id: 'arnold-press', name: 'Arnold Press', muscleGroup: 'Shoulders', suggestedReps: 10, suggestedSets: 3 },
    { id: 'face-pulls', name: 'Face Pulls', muscleGroup: 'Shoulders', suggestedReps: 15, suggestedSets: 3 },
    
    // PUSH - Triceps
    { id: 'tricep-pushdown', name: 'Tricep Pushdown (Straight Bar)', muscleGroup: 'Triceps', suggestedReps: 12, suggestedSets: 3 },
    { id: 'rope-pushdown', name: 'Tricep Rope Pushdown', muscleGroup: 'Triceps', suggestedReps: 15, suggestedSets: 3 },
    { id: 'v-bar-pushdown', name: 'Tricep V-Bar Pushdown', muscleGroup: 'Triceps', suggestedReps: 12, suggestedSets: 3 },
    { id: 'single-arm-cable-ext', name: 'Single Arm Cable Ext', muscleGroup: 'Triceps', suggestedReps: 12, suggestedSets: 3 },
    { id: 'skull-crushers', name: 'Skull Crushers', muscleGroup: 'Triceps', suggestedReps: 10, suggestedSets: 3 },
    { id: 'overhead-tricep-ext', name: 'Overhead Extension', muscleGroup: 'Triceps', suggestedReps: 12, suggestedSets: 3 },

    // PULL - Back
    { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back', suggestedReps: 5, suggestedSets: 1 },
    { id: 'pull-ups', name: 'Pull Ups', muscleGroup: 'Back', suggestedReps: 10, suggestedSets: 3, isBodyweight: true },
    { id: 'lat-pulldowns', name: 'Lat Pulldowns', muscleGroup: 'Back', suggestedReps: 10, suggestedSets: 3 },
    { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'Back', suggestedReps: 10, suggestedSets: 3 },
    { id: 'straight-arm-pulldown', name: 'Straight-Arm Pulldown', muscleGroup: 'Back', suggestedReps: 12, suggestedSets: 3 },
    { id: 'single-arm-cable-row', name: 'Single Arm Cable Row', muscleGroup: 'Back', suggestedReps: 12, suggestedSets: 3 },
    { id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'Back', suggestedReps: 8, suggestedSets: 3 },
    { id: 'one-arm-row', name: 'One-Arm DB Row', muscleGroup: 'Back', suggestedReps: 10, suggestedSets: 3 },
    
    // PULL - Biceps
    { id: 'bicep-curl', name: 'Dumbbell Curls', muscleGroup: 'Biceps', suggestedReps: 12, suggestedSets: 3 },
    { id: 'cable-curl-bar', name: 'Cable Bicep Curl (Bar)', muscleGroup: 'Biceps', suggestedReps: 12, suggestedSets: 3 },
    { id: 'cable-hammer-curl', name: 'Cable Hammer Curl (Rope)', muscleGroup: 'Biceps', suggestedReps: 12, suggestedSets: 3 },
    { id: 'single-arm-cable-curl', name: 'Single Arm Cable Curl', muscleGroup: 'Biceps', suggestedReps: 12, suggestedSets: 3 },
    { id: 'hammer-curl', name: 'Hammer Curls', muscleGroup: 'Biceps', suggestedReps: 12, suggestedSets: 3 },
    { id: 'preacher-curl', name: 'Preacher Curls', muscleGroup: 'Biceps', suggestedReps: 10, suggestedSets: 3 },
    
    // LEGS
    { id: 'squat', name: 'Back Squat', muscleGroup: 'Legs', suggestedReps: 5, suggestedSets: 5 },
    { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Legs', suggestedReps: 10, suggestedSets: 3 },
    { id: 'cable-pull-through', name: 'Cable Pull-Through', muscleGroup: 'Legs', suggestedReps: 12, suggestedSets: 3 },
    { id: 'cable-glute-kickback', name: 'Cable Kickbacks', muscleGroup: 'Legs', suggestedReps: 15, suggestedSets: 3 },
    { id: 'cable-abductor', name: 'Cable Abductor Lift', muscleGroup: 'Legs', suggestedReps: 15, suggestedSets: 3 },
    { id: 'lunges', name: 'Lunges', muscleGroup: 'Legs', suggestedReps: 12, suggestedSets: 3 },
    { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'Legs', suggestedReps: 12, suggestedSets: 3 },
    { id: 'leg-curl', name: 'Leg Curls', muscleGroup: 'Legs', suggestedReps: 12, suggestedSets: 3 },
    { id: 'calf-raise', name: 'Calf Raises', muscleGroup: 'Legs', suggestedReps: 15, suggestedSets: 4 },
]
