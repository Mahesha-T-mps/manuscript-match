// Debug script to check shortlist export filtering
console.log('=== Shortlist Export Debug ===');

// Check what's in localStorage for a sample process
const processId = 'your-process-id'; // Replace with actual process ID

// Check for selected validation conditions
const selectedConditionsKey = `process_${processId}_selectedValidationConditions`;
const selectedConditionsData = localStorage.getItem(selectedConditionsKey);

console.log('Selected Conditions Key:', selectedConditionsKey);
console.log('Selected Conditions Data:', selectedConditionsData);

if (selectedConditionsData) {
  try {
    const conditions = JSON.parse(selectedConditionsData);
    console.log('Parsed Selected Conditions:', conditions);
    console.log('Number of conditions:', conditions.length);
  } catch (error) {
    console.error('Failed to parse conditions:', error);
  }
} else {
  console.log('No selected validation conditions found in localStorage');
}

// Check validation recommendations data
const validationKey = `process_${processId}_validationRecommendations`;
const validationData = localStorage.getItem(validationKey);

console.log('Validation Key:', validationKey);
console.log('Validation Data exists:', !!validationData);

if (validationData) {
  try {
    const parsed = JSON.parse(validationData);
    console.log('Validation data structure:', Object.keys(parsed));
    if (parsed.data && parsed.data.reviewers) {
      console.log('Number of reviewers in validation data:', parsed.data.reviewers.length);
      console.log('Sample reviewer keys:', Object.keys(parsed.data.reviewers[0] || {}));
    }
  } catch (error) {
    console.error('Failed to parse validation data:', error);
  }
}

// Test the export utils directly
import { generateCSV } from './src/utils/exportUtils.ts';

const sampleReviewer = {
  reviewer: 'Dr. Test',
  email: 'test@example.com',
  aff: 'Test University',
  city: 'Test City',
  country: 'Test Country',
  conditions_met: 5,
  conditions_satisfied: '5 of 9',
  Total_Publications: 20,
  Publications_10_years: 15,
  English_Pubs: 18,
  coauthor: false,
  Clinical_Trials_no: 3
};

const testConditions = ['Publications', 'Coauthor'];

console.log('=== Testing Export Utils ===');
try {
  const csvWithConditions = generateCSV([sampleReviewer], testConditions);
  console.log('CSV with conditions (first line):', csvWithConditions.split('\n')[0]);
  
  const csvWithoutConditions = generateCSV([sampleReviewer]);
  console.log('CSV without conditions (first line):', csvWithoutConditions.split('\n')[0]);
  
  console.log('Headers with conditions count:', csvWithConditions.split('\n')[0].split(',').length);
  console.log('Headers without conditions count:', csvWithoutConditions.split('\n')[0].split(',').length);
} catch (error) {
  console.error('Export utils test failed:', error);
}