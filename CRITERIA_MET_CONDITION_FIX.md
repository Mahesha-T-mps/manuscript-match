# Criteria Met Condition Fix

## Issue Description

In the Reviewer Recommendations workflow step, the system was displaying "X of 9" criteria met for all reviewers, regardless of how many validation conditions were actually selected during the Author Validation step.

### Problem
- The criteria count was hardcoded to 9 (all possible conditions)
- This was misleading because users could select fewer conditions during validation
- Example: If only 3 conditions were selected, it should show "2 of 3" not "2 of 9"

## Root Cause

The `ReviewerResults.tsx` component had multiple hardcoded references to "9" criteria:

1. **Badge display**: `{reviewer.conditions_met}/9 criteria met`
2. **Average score**: `Average score: {score}/9`
3. **Filter slider**: `max={9}` and label showing "/9"
4. **Validation summary**: `Average Score: {score}/9`
5. **Fallback conditions_satisfied**: `${count} of 8` (even had wrong number!)

## Solution Implemented

Updated all hardcoded "9" references to dynamically use the actual number of selected validation conditions:

```typescript
// Dynamic calculation
const maxConditions = selectedValidationConditions && selectedValidationConditions.length > 0 
  ? selectedValidationConditions.length 
  : 9; // Fallback to 9 if no selection data available
```

### Changes Made

1. **Badge Display** (Line ~721)
   ```tsx
   <Badge>
     {reviewer.conditions_met}/{selectedValidationConditions?.length || 9} criteria met
   </Badge>
   ```

2. **Card Description** (Line ~485)
   ```tsx
   Average score: {score.toFixed(1)}/{selectedValidationConditions?.length || 9}
   ```

3. **Filter Slider** (Line ~520)
   ```tsx
   <Slider
     max={selectedValidationConditions?.length || 9}
   />
   <Label>
     Minimum Validation Score: {min}/{selectedValidationConditions?.length || 9}
   </Label>
   ```

4. **Validation Summary** (Line ~545)
   ```tsx
   Average Score: {score.toFixed(2)}/{selectedValidationConditions?.length || 9}
   ```

5. **Conditions Satisfied Fallback** (Line ~115)
   ```tsx
   conditions_satisfied: reviewer.conditions_satisfied || 
     `${reviewer.conditions_met || 0} of ${selectedValidationConditions?.length || 9}`
   ```

## How It Works

### Data Flow

1. **Author Validation Step**
   - User selects specific validation conditions (e.g., Publications, COI, Retraction History)
   - Selected conditions are stored in `selectedValidationConditions` array
   - This array is passed to the validation API

2. **Reviewer Recommendations Step**
   - `selectedValidationConditions` prop is passed to `ReviewerResults` component
   - Component dynamically calculates the maximum possible score
   - Displays "X of Y" where Y = number of selected conditions

### Example Scenarios

**Scenario 1: 3 Conditions Selected**
- Selected: Publications, COI, Retraction History
- Display: "2 of 3 criteria met" (not "2 of 9")
- Filter slider: 0 to 3 (not 0 to 9)

**Scenario 2: All 9 Conditions Selected**
- Selected: All available conditions
- Display: "7 of 9 criteria met"
- Filter slider: 0 to 9

**Scenario 3: No Selection Data (Fallback)**
- If `selectedValidationConditions` is undefined or empty
- Display: "X of 9 criteria met" (assumes all conditions)
- This maintains backward compatibility

## Testing

### Test Cases

1. **Select 3 conditions** → Verify displays show "/3"
2. **Select 5 conditions** → Verify displays show "/5"
3. **Select all 9 conditions** → Verify displays show "/9"
4. **No selection data** → Verify fallback to "/9"
5. **Filter slider** → Verify max value matches selected count
6. **Average score** → Verify calculation uses correct denominator

### Verification Steps

1. Start a new process
2. Go to Author Validation step
3. Select only 3 validation conditions (e.g., Publications, COI, Retraction)
4. Run validation
5. Go to Reviewer Recommendations
6. Verify all displays show "X of 3" not "X of 9"
7. Check filter slider max is 3
8. Check average score denominator is 3

## Benefits

1. **Accurate Representation**: Shows actual criteria count used
2. **User Clarity**: Users understand what the score means
3. **Flexible Validation**: Supports any number of selected conditions
4. **Backward Compatible**: Falls back to 9 if no selection data

## Related Components

- `src/components/results/ReviewerResults.tsx` - Main component fixed
- `src/components/validation/AuthorValidation.tsx` - Where conditions are selected
- `src/components/process/ProcessWorkflow.tsx` - Passes selectedValidationConditions prop

## Available Validation Conditions

The system supports 9 validation conditions:

1. Publications
2. First/Last Author Publications
3. Relevant Publications
4. Publication Types
5. T&F Publications last year
6. Conflict of Interest
7. Retraction History
8. Study Type Detection
9. Sanction Country Check

Users can select any combination of these during the Author Validation step.