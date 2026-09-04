/**
 * Debug script for Excel export issue
 * Run this in browser console while on Reports page
 */

// Check what data is available
console.log('=== Custom Reports Data ===');
console.log('customReports:', window.customReports);
console.log('totalProcesses:', window.totalProcesses);
console.log('totalShortlisted:', window.totalShortlisted);

// Sample data structure that should work
const sampleExportData = {
  type: 'custom',
  customReports: [
    {
      id: '1',
      processTitle: 'Test Process 1',
      shortlistedCount: 2,
      reportDate: new Date().toISOString(),
      shortlistedAuthors: [
        { name: 'Author 1', email: 'author1@test.com', affiliation: 'University A' },
        { name: 'Author 2', email: 'author2@test.com', affiliation: 'University B' }
      ]
    },
    {
      id: '2',
      processTitle: 'Test Process 2',
      shortlistedCount: 1,
      reportDate: new Date().toISOString(),
      shortlistedAuthors: [
        { name: 'Author 3', email: 'author3@test.com', affiliation: 'University C' }
      ]
    }
  ],
  totalProcesses: 2,
  totalShortlisted: 3,
  averageShortlisted: 1.5
};

console.log('Sample expected structure:', sampleExportData);

// Test if customReports array is populated
if (sampleExportData.customReports && sampleExportData.customReports.length > 0) {
  console.log('✓ customReports array exists and has data');
  console.log('  Number of reports:', sampleExportData.customReports.length);
  
  sampleExportData.customReports.forEach((r, idx) => {
    console.log(`  Report ${idx + 1}:`, {
      title: r.processTitle,
      count: r.shortlistedCount,
      authorsCount: r.shortlistedAuthors?.length || 0
    });
  });
} else {
  console.log('✗ customReports array is empty or undefined');
}
