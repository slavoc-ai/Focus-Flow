# DeepWork Page Task Display Analysis

## Issue Summary
The DeepWork page displays tasks correctly when accessed from plan-review but shows incorrect/inconsistent display when accessed from projects view or dashboard.

## 1. Reproduction and Documentation

### Entry Point Analysis

#### A. Plan Review → DeepWork (WORKING)
**Navigation Path:** `PlanReviewPage.tsx` → `handleStartSession()` → `navigate('/deep-work', { state: sessionData })`

**Data Structure Passed:**
```typescript
const sessionData = {
  plan: finalPlanData, // Enhanced structure with title, action, details
  mainTask: projectTitle || taskDescription,
  projectId: finalProjectId,
  originalQuery: taskDescription,
  timeAllocated: timeAllocated || 0,
  energyLevel,
  strictTimeAdherence,
  documentFiles: documentFiles.map(f => f.name)
};

// Where finalPlanData has enhanced structure:
finalPlanData = result.project.sub_tasks?.map(dbTask => ({
  id: dbTask.id,
  title: dbTask.title || dbTask.description,
  action: dbTask.action || dbTask.description,
  details: dbTask.details || dbTask.description,
  estimated_minutes_per_sub_task: dbTask.estimated_minutes_per_sub_task,
  isCompleted: dbTask.is_completed
}))
```

#### B. Projects View → DeepWork (PROBLEMATIC)
**Navigation Path:** `ProjectListPage.tsx` → `handleStartSession()` → `navigate('/deep-work', { state })`

**Data Structure Passed:**
```typescript
navigate('/deep-work', {
  state: {
    plan: project.sub_tasks?.map(task => ({
      id: task.id,
      sub_task_description: task.description, // OLD FORMAT!
      estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
      isCompleted: task.is_completed
    })),
    mainTask: project.title,
    projectId: project.id,
    // ... other fields
  }
});
```

#### C. Dashboard → DeepWork (PROBLEMATIC)
**Navigation Path:** `DashboardPage.tsx` → `handleStartQuickSession()` → `navigate('/deep-work', { state })`

**Data Structure Passed:**
```typescript
navigate('/deep-work', {
  state: {
    plan: project.sub_tasks?.map(task => ({
      id: task.id,
      sub_task_description: task.description, // OLD FORMAT!
      estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
      isCompleted: task.is_completed
    })),
    mainTask: project.title,
    projectId: project.id,
    // ... other fields
  }
});
```

## 2. Data Flow Path Comparison

### Working Path (Plan Review)
1. **Source:** Fresh plan generation or edited existing project
2. **Data Format:** Enhanced structure with `title`, `action`, `details`
3. **Database Query:** Uses `projectService.saveNewProjectAndPlan()` or `projectService.updateProject()`
4. **Mapping:** Explicitly maps enhanced fields from database

### Problematic Paths (Projects/Dashboard)
1. **Source:** Existing projects from database
2. **Data Format:** Legacy structure with only `description`
3. **Database Query:** Uses `projectService.getProjectsByUserId()`
4. **Mapping:** Only maps `description` to `sub_task_description`

## 3. Technical Investigation

### Database Schema Analysis
The database has been enhanced to support the new structure:

```sql
-- Enhanced sub_tasks table
CREATE TABLE public.sub_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text DEFAULT '', -- NEW: Short headline
  action text DEFAULT '', -- NEW: Immediate call to action  
  details text DEFAULT '', -- NEW: Longer explanation
  description text NOT NULL, -- LEGACY: Backward compatibility
  estimated_minutes_per_sub_task integer,
  is_completed boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
```

### Component Mapping Issues

#### DeepWorkPage.tsx Mapping
```typescript
// Current mapping in DeepWorkPage.tsx (CORRECT)
const [subTasks, setSubTasks] = useState<SubTask[]>(() => {
  return planData.map((task: any, index: number) => ({
    id: task.id || `task-${index + 1}`,
    title: task.title || `Task ${index + 1}`, // ✅ Handles enhanced
    action: task.action || task.description || task.sub_task_description || '', // ✅ Fallback
    details: task.details || task.description || task.sub_task_description || '', // ✅ Fallback
    estimated_minutes_per_sub_task: task.estimatedMinutes || task.estimated_minutes_per_sub_task,
    isCompleted: task.completed || task.isCompleted || false,
    sub_task_description: task.sub_task_description || task.description || task.action // ✅ Backward compatibility
  }));
});
```

#### ProjectListPage.tsx Mapping (PROBLEMATIC)
```typescript
// Current mapping in ProjectListPage.tsx (INCORRECT)
plan: project.sub_tasks?.map(task => ({
  id: task.id,
  sub_task_description: task.description, // ❌ Only maps description
  estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
  isCompleted: task.is_completed
  // ❌ Missing: title, action, details
}))
```

#### DashboardPage.tsx Mapping (PROBLEMATIC)
```typescript
// Current mapping in DashboardPage.tsx (INCORRECT)
plan: project.sub_tasks?.map(task => ({
  id: task.id,
  sub_task_description: task.description, // ❌ Only maps description
  estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
  isCompleted: task.is_completed
  // ❌ Missing: title, action, details
}))
```

### Database Query Analysis

#### ProjectService.getProjectsByUserId()
```typescript
const { data: projects, error } = await supabase
  .from('projects')
  .select(`
    *,
    sub_tasks (*)  // ✅ This DOES include title, action, details
  `)
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });
```

**Finding:** The database query IS returning the enhanced fields, but the frontend mapping is ignoring them.

## 4. Root Cause Analysis

### Primary Issue: Inconsistent Data Mapping
The problem is **NOT** in the database or data retrieval, but in the **frontend data transformation** before navigation to DeepWork page.

1. **Plan Review Path:** Maps enhanced structure correctly
2. **Projects/Dashboard Paths:** Only map legacy `description` field, ignoring `title`, `action`, `details`

### Secondary Issue: Missing Enhanced Structure Display
Even when enhanced data is available, some components still fall back to displaying only the description.

## 5. Test Cases for Reproduction

### Test Case 1: Enhanced Project from Plan Review
1. Create new project with enhanced structure
2. Navigate: Home → Plan Review → Start Session
3. **Expected:** Rich display with title, action, details
4. **Actual:** ✅ Works correctly

### Test Case 2: Same Project from Projects View  
1. Navigate: Projects → Start Session (same project as Test Case 1)
2. **Expected:** Rich display with title, action, details
3. **Actual:** ❌ Shows only description text

### Test Case 3: Same Project from Dashboard
1. Navigate: Dashboard → Start Session (same project as Test Case 1)  
2. **Expected:** Rich display with title, action, details
3. **Actual:** ❌ Shows only description text

### Test Case 4: Legacy Project (Pre-Enhancement)
1. Use project created before enhancement
2. Navigate from any entry point
3. **Expected:** Graceful fallback to description
4. **Actual:** ❌ May show empty fields

## 6. Solution Requirements

### Fix 1: Update ProjectListPage.tsx Navigation Data
Map enhanced structure when navigating to DeepWork:

```typescript
plan: project.sub_tasks?.map(task => ({
  id: task.id,
  title: task.title || 'Task',
  action: task.action || task.description,
  details: task.details || task.description,
  estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
  isCompleted: task.is_completed
}))
```

### Fix 2: Update DashboardPage.tsx Navigation Data
Apply same enhanced mapping as Fix 1.

### Fix 3: Ensure TaskCarousel Handles All Data Formats
Verify TaskCarousel component gracefully handles both enhanced and legacy data structures.

### Fix 4: Add Data Validation
Add logging to verify data structure at each navigation point for debugging.

## 7. Implementation Priority

1. **High Priority:** Fix ProjectListPage.tsx and DashboardPage.tsx data mapping
2. **Medium Priority:** Add data validation and logging
3. **Low Priority:** Enhance backward compatibility for legacy projects

This analysis shows the issue is a **data transformation inconsistency** in the frontend navigation logic, not a database or component rendering problem.