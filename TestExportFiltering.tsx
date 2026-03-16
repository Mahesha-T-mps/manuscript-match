/**
 * Test component for debugging export filtering
 * Add this to your app temporarily to test the export functionality
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateCSV, generateJSON } from '@/utils/exportUtils';

const TestExportFiltering: React.FC = () => {
  const [testResults, setTestResults] = useState<string>('');

  const mockReviewer = {
    reviewer: 'Dr. Test Reviewer',
    email: 'test@university.edu',
    aff: 'Test University',
    city: 'Test City',
    country: 'Test Country',
    conditions_met: 6,
    conditions_satisfied: '6 of 9',
    Total_Publications: 45,
    Total_Publications_first: 12,
    Total_Publications_last: 8,
    Publications_10_years: 35,
    Publications_10_years_first: 10,
    Publications_10_years_last: 6,
    Publications_5_years: 20,
    Publications_5_years_first: 5,
    Publications_5_years_last: 3,
    Relevant_Publications_5_years: 15,
    Publications_2_years: 8,
    Publications_last_year: 3,
    English_Pubs: 40,
    english_ratio: 0.89,
    Clinical_Trials_no: 5,
    Case_reports_no: 2,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 1,
    coauthor: false,
    aff_match: 'no',
    country_match: 'yes',
    sanction_country: 'no',
    no_of_pub_condition_10_years: 1,
    no_of_pub_condition_5_years: 1,
    no_of_pub_condition_2_years: 1,
    english_condition: 1,
    coauthor_condition: 1,
    aff_condition: 1,
    country_match_condition: 1,
    retracted_condition: 1
  };

  const runTests = () => {
    let results = '=== Export Filtering Test Results ===\n\n';

    try {
      // Test 1: With selected conditions
      const selectedConditions = ['Publications', 'Coauthor'];
      const csvWithConditions = generateCSV([mockReviewer], selectedConditions);
      const headersWithConditions = csvWithConditions.split('\n')[0].split(',');
      
      results += `Test 1: With conditions ["Publications", "Coauthor"]\n`;
      results += `Headers (${headersWithConditions.length}): ${headersWithConditions.join(', ')}\n\n`;

      // Test 2: Without conditions (all columns)
      const csvWithoutConditions = generateCSV([mockReviewer]);
      const headersWithoutConditions = csvWithoutConditions.split('\n')[0].split(',');
      
      results += `Test 2: Without conditions (all columns)\n`;
      results += `Headers (${headersWithoutConditions.length}): ${headersWithoutConditions.slice(0, 10).join(', ')}...\n\n`;

      // Test 3: JSON export with conditions
      const jsonWithConditions = generateJSON([mockReviewer], selectedConditions);
      const jsonData = JSON.parse(jsonWithConditions);
      
      results += `Test 3: JSON with conditions\n`;
      results += `Selected conditions in export: ${JSON.stringify(jsonData.selectedValidationConditions)}\n`;
      results += `First reviewer keys: ${Object.keys(jsonData.reviewers[0]).join(', ')}\n\n`;

      // Test 4: Check localStorage for current process
      const processId = 'test-process'; // You might need to adjust this
      const storageKey = `process_${processId}_selectedValidationConditions`;
      const storedConditions = localStorage.getItem(storageKey);
      
      results += `Test 4: localStorage check\n`;
      results += `Key: ${storageKey}\n`;
      results += `Stored data: ${storedConditions}\n`;
      
      if (storedConditions) {
        try {
          const parsed = JSON.parse(storedConditions);
          results += `Parsed conditions: ${JSON.stringify(parsed)}\n`;
        } catch (error) {
          results += `Parse error: ${error}\n`;
        }
      }

      results += '\n=== Test Complete ===';
      
    } catch (error) {
      results += `ERROR: ${error}\n`;
    }

    setTestResults(results);
    console.log(results);
  };

  const testLocalStorage = () => {
    // Set test conditions in localStorage
    const processId = 'test-process';
    const testConditions = ['Publications', 'Coauthor', 'Publication Types'];
    
    localStorage.setItem(
      `process_${processId}_selectedValidationConditions`,
      JSON.stringify(testConditions)
    );
    
    setTestResults(`Set test conditions in localStorage:\nKey: process_${processId}_selectedValidationConditions\nValue: ${JSON.stringify(testConditions)}\n\nNow run the export test to see if filtering works.`);
  };

  const clearLocalStorage = () => {
    const allKeys = Object.keys(localStorage);
    const validationKeys = allKeys.filter(key => key.includes('selectedValidationConditions'));
    
    validationKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    setTestResults(`Cleared ${validationKeys.length} validation condition keys from localStorage:\n${validationKeys.join('\n')}`);
  };

  return (
    <Card className="max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle>Export Filtering Test Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runTests}>Run Export Tests</Button>
          <Button onClick={testLocalStorage} variant="outline">Set Test Conditions</Button>
          <Button onClick={clearLocalStorage} variant="outline">Clear localStorage</Button>
        </div>
        
        {testResults && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {testResults}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestExportFiltering;