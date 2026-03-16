# Integration Test Steps

## ✅ Integration Complete!

The author selection feature has been successfully integrated into your ProcessWorkflow. Here's what was added:

### Changes Made:

1. **ProcessWorkflow.tsx**:
   - Added import for `AuthorSelectionStep`
   - Updated DATABASE_SEARCH next button to go to "AUTHOR_SELECTION"
   - Added new "AUTHOR_SELECTION" case that shows the selection UI

2. **ProcessStepTracker.tsx**:
   - Added "AUTHOR_SELECTION" step (order 5) between DATABASE_SEARCH and MANUAL_SEARCH
   - Updated all subsequent step orders

3. **ProcessDashboard.tsx**:
   - Updated step order mapping to include AUTHOR_SELECTION
   - Updated total steps from 8 to 9

4. **ReviewerSearch.tsx**:
   - Updated step order array to include AUTHOR_SELECTION

## Testing Steps:

### 1. Complete Database Search
1. Go through the normal workflow: Upload → Metadata → Keywords → Database Search
2. Complete the database search step
3. You should now see a "Next: Select Authors" button instead of "Next Step"

### 2. Test Author Selection
1. Click "Next: Select Authors"
2. You should see the Author Selection screen with:
   - List of all authors found in database search
   - Search/filter functionality
   - Select all / Clear buttons
   - Selection counter

### 3. Select Authors
1. Try the search functionality (search by name, email, etc.)
2. Select some authors (not all)
3. Click "Continue with X Authors"
4. Should show success message and move to Manual Search step

### 4. Verify Backend Integration
1. Continue to Validation step
2. Start validation
3. Check that only selected authors are being validated (not all)

## Expected Flow:

```
Database Search → Select Authors → Manual Search → Validation (selected only)
```

## Troubleshooting:

### If you don't see "Select Authors" button:
- Make sure database search completed successfully
- Check browser console for errors
- Verify search results are cached in localStorage

### If author selection screen is empty:
- Check that database search found authors
- Look in browser localStorage for `process_[ID]_searchResults`
- Verify the search results have the expected format

### If validation still processes all authors:
- Check that `/filter_selected_authors` API was called successfully
- Verify `author_email_df_selected.csv` file was created in job folder
- Check validation logs to see which file it's using

## Success Indicators:

✅ Database search shows "Next: Select Authors" button  
✅ Author selection screen loads with found authors  
✅ Can search/filter authors  
✅ Can select specific authors  
✅ Selection is saved and validation uses only selected authors  
✅ Step tracker shows new "Select Authors" step  

## Next Steps:

1. Test the complete workflow end-to-end
2. Verify performance improvement (faster validation with fewer authors)
3. Consider adding "Skip Selection" option if needed
4. Add any additional UI improvements based on user feedback

The integration is now complete and ready for testing! 🎉