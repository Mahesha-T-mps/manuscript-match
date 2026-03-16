// Test CSV parsing issue
// Run this in browser console to test the CSV parsing problem

console.log('=== CSV Parsing Test ===');

// Simulate the issue with affiliation containing commas
const testData = {
  reviewer: 'Muhammad Kamal Hossain',
  email: 'kamalhossain@jbnu.ac.kr',
  aff: 'Department of Computer Science, Jeonbuk National University, South Korea',  // Contains commas!
  city: 'Jeonju',
  country: 'South Korea',
  Total_Publications: 13
};

// Test how CSV escaping works
function escapeCSVField(field) {
  if (field === undefined || field === null) {
    return '';
  }

  if (typeof field === 'number' || typeof field === 'boolean') {
    return String(field);
  }

  const stringField = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

// Test CSV generation
const headers = ['author', 'email', 'aff', 'city', 'country', 'Total_Publications'];
const row = [
  escapeCSVField(testData.reviewer),
  escapeCSVField(testData.email),
  escapeCSVField(testData.aff),
  escapeCSVField(testData.city),
  escapeCSVField(testData.country),
  escapeCSVField(testData.Total_Publications)
];

const csvLine = row.join(',');
console.log('Headers:', headers);
console.log('Row data:', row);
console.log('CSV line:', csvLine);

// Test simple split (this is what's causing the problem)
const simpleSplit = csvLine.split(',');
console.log('Simple split result:', simpleSplit);
console.log('Simple split count:', simpleSplit.length);
console.log('Headers count:', headers.length);
console.log('Counts match:', simpleSplit.length === headers.length);

// Test proper CSV parsing
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

const properParse = parseCSVLine(csvLine);
console.log('Proper parse result:', properParse);
console.log('Proper parse count:', properParse.length);
console.log('Proper counts match:', properParse.length === headers.length);

console.log('\n=== Comparison ===');
console.log('Expected affiliation:', testData.aff);
console.log('Simple split affiliation (WRONG):', simpleSplit[2]);
console.log('Proper parse affiliation (CORRECT):', properParse[2]);

console.log('\n=== Conclusion ===');
if (simpleSplit.length !== headers.length) {
  console.log('❌ PROBLEM IDENTIFIED: Simple CSV split breaks with commas in data');
  console.log('This causes column misalignment in Excel export');
} else {
  console.log('✅ No issue with this test data');
}

if (properParse.length === headers.length) {
  console.log('✅ SOLUTION WORKS: Proper CSV parsing handles commas correctly');
} else {
  console.log('❌ Solution needs more work');
}