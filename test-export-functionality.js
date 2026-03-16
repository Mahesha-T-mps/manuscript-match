// Simple test to verify export functionality with selected validation conditions
const { generateCSV, generateJSON } = require('./src/utils/exportUtils.ts');

// Mock reviewer data
const mockReviewers = [
  {
    reviewer: 'Dr. John Smith',
    email: 'john.smith@university.edu',
    aff: 'University of Science',
    city: 'Boston',
    country: 'USA',
    conditions_met: 7,
    conditions_satisfied: '7 of 9',
    Total_Publications: 45,
    Publications_10_years: 35,
    English_Pubs: 40,
    coauthor: false,
    aff_match: 'no',
    country_match: 'yes',
    Clinical_Trials_no: 5,
    Retracted_Pubs_no: 0
  },
  {
    reviewer: 'Dr. Jane Doe',
    email: 'jane.doe@research.org',
    aff: 'Research Institute',
    city: 'New York',
    country: 'USA',
    conditions_met: 8,
    conditions_satisfied: '8 of 9',
    Total_Publications: 62,
    Publications_10_years: 48,
    English_Pubs: 58,
    coauthor: false,
    aff_match: 'no',
    country_match: 'yes',
    Clinical_Trials_no: 8,
    Retracted_Pubs_no: 0
  }
];

// Test with selected conditions
const selectedConditions = ['Publications', 'Coauthor', 'Publication Types'];

console.log('Testing CSV export with selected conditions...');
try {
  const csvWithConditions = generateCSV(mockReviewers, selectedConditions);
  console.log('CSV with selected conditions generated successfully');
  console.log('Headers:', csvWithConditions.split('\n')[0]);
} catch (error) {
  console.error('CSV export with conditions failed:', error.message);
}

console.log('\nTesting JSON export with selected conditions...');
try {
  const jsonWithConditions = generateJSON(mockReviewers, selectedConditions);
  const parsed = JSON.parse(jsonWithConditions);
  console.log('JSON with selected conditions generated successfully');
  console.log('Selected conditions:', parsed.selectedValidationConditions);
  console.log('First reviewer keys:', Object.keys(parsed.reviewers[0]));
} catch (error) {
  console.error('JSON export with conditions failed:', error.message);
}

console.log('\nTesting CSV export without conditions (backward compatibility)...');
try {
  const csvWithoutConditions = generateCSV(mockReviewers);
  console.log('CSV without conditions generated successfully');
  console.log('Headers:', csvWithoutConditions.split('\n')[0]);
} catch (error) {
  console.error('CSV export without conditions failed:', error.message);
}

console.log('\nTesting JSON export without conditions (backward compatibility)...');
try {
  const jsonWithoutConditions = generateJSON(mockReviewers);
  const parsed = JSON.parse(jsonWithoutConditions);
  console.log('JSON without conditions generated successfully');
  console.log('Selected conditions:', parsed.selectedValidationConditions);
  console.log('First reviewer has publications object:', !!parsed.reviewers[0].publications);
} catch (error) {
  console.error('JSON export without conditions failed:', error.message);
}