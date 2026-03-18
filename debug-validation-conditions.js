// Debug script to check validation conditions counting issue
// Run this in the browser console on the validation page

console.log('=== Validation Conditions Debug ===');

// Check localStorage for the current process
const processId = window.location.pathname.split('/').pop();
console.log('Process ID:', processId);

const storageKey = `process_${processId}_selectedValidationConditions`;
const storedConditions = localStorage.getItem(storageKey);
console.log('Stored conditions:', storedConditions);

if (storedConditions) {
  try {
    const parsed = JSON.parse(storedConditions);
    console.log('Parsed conditions:', parsed);
    console.log('Count:', parsed.length);
    
    // Check each condition
    parsed.forEach((condition, index) => {
      console.log(`${index + 1}. "${condition}"`);
    });
    
    // Check for duplicates
    const unique = [...new Set(parsed)];
    if (unique.length !== parsed.length) {
      console.warn('DUPLICATES FOUND!');
      console.log('Unique conditions:', unique);
      console.log('Duplicate count:', parsed.length - unique.length);
    }
    
  } catch (e) {
    console.error('Failed to parse stored conditions:', e);
  }
}

// Check the validation conditions array
const VALIDATION_CONDITIONS = [
  { id: 'Publications', label: 'Publications' },
  { id: 'First/Last Author in publications', label: 'First/Last Author Publications' },
  { id: 'Relevant Publications', label: 'Relevant Publications' },
  { id: 'Publication Types', label: 'Publication Types' },
  { id: 'T&F Publications last year', label: 'Taylor & Francis Publications' },
  { id: 'Conflict of Interest', label: 'Conflict of Interest' },
  { id: 'Retraction History', label: 'Retraction History' },
  { id: 'Study Type Detection', label: 'Study Type Detection' },
  { id: 'Sanction Country', label: 'Sanction Country Check' }
];

console.log('Available conditions:', VALIDATION_CONDITIONS.length);
VALIDATION_CONDITIONS.forEach((condition, index) => {
  console.log(`${index + 1}. ID: "${condition.id}" | Label: "${condition.label}"`);
});

// Check checkboxes on the page
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
console.log('Checkboxes found:', checkboxes.length);

let checkedCount = 0;
checkboxes.forEach((checkbox, index) => {
  if (checkbox.checked) {
    checkedCount++;
    console.log(`Checked ${index + 1}: ID="${checkbox.id}"`);
  }
});

console.log('Total checked:', checkedCount);

// Clear localStorage to reset (uncomment if needed)
// localStorage.removeItem(storageKey);
// console.log('Cleared localStorage for validation conditions');