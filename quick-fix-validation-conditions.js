// Quick fix script - Run this in browser console to set validation conditions
// This will allow you to test the export filtering immediately

console.log('=== Quick Fix for Validation Conditions ===');

// Your process ID from the logs
const processId = '0013c59a-62e4-4629-af34-8c87e3fbedb6';

// Set some test validation conditions
const testConditions = ['Publications', 'Coauthor', 'Publication Types'];

// Save to localStorage
const key = `process_${processId}_selectedValidationConditions`;
localStorage.setItem(key, JSON.stringify(testConditions));

console.log('✅ Set validation conditions for process:', processId);
console.log('✅ Conditions:', testConditions);
console.log('✅ Key:', key);

// Verify it was saved
const saved = localStorage.getItem(key);
console.log('✅ Verification - Saved data:', saved);
console.log('✅ Verification - Parsed:', JSON.parse(saved));

console.log('\n🎯 Now try exporting your shortlist again!');
console.log('Expected result: Export should only include columns for Publications, Coauthor, and Publication Types');
console.log('Expected column count: ~25 columns instead of 46');

// Show what columns should be included
const expectedColumns = {
  'Base columns (always included)': ['author', 'email', 'aff', 'city', 'country', 'conditions_met', 'conditions_satisfied'],
  'Publications': ['Total_Publications', 'Publications_10_years', 'Publications_2_years', 'no_of_pub_condition_10_years', 'no_of_pub_condition_2_years'],
  'Coauthor': ['coauthor', 'coauthor_condition'],
  'Publication Types': ['English_Pubs', 'english_ratio', 'english_condition', 'Clinical_Trials_no', 'Clinical_study_no', 'Case_reports_no', 'Retracted_Pubs_no', 'retracted_condition']
};

console.log('\n📋 Expected columns to be included:');
Object.entries(expectedColumns).forEach(([category, columns]) => {
  console.log(`${category}: ${columns.join(', ')}`);
});

console.log('\n❌ Columns that should NOT be included:');
console.log('- Publications_5_years, Relevant_Publications_5_years (Relevant Publications condition not selected)');
console.log('- TF_Publications_last_year (T&F Publications condition not selected)');
console.log('- aff_match, country_match, sanction_country (Affiliation/Country match condition not selected)');
console.log('- study_type (Study Type Detection condition not selected)');

// Function to clear the conditions if needed
window.clearValidationConditions = function() {
  localStorage.removeItem(key);
  console.log('🗑️ Cleared validation conditions');
};

console.log('\n🔧 To clear conditions later, run: clearValidationConditions()');