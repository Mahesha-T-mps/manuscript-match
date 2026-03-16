// Debug script to run in browser console to check shortlist export filtering
// Copy and paste this into your browser console when on the shortlist page

console.log('=== Shortlist Export Debug Tool ===');

// Function to check localStorage for validation conditions
function checkValidationConditions() {
    console.log('\n--- Checking Validation Conditions in localStorage ---');
    
    // Get all localStorage keys that might contain validation conditions
    const allKeys = Object.keys(localStorage);
    const validationKeys = allKeys.filter(key => key.includes('selectedValidationConditions'));
    
    console.log('All localStorage keys:', allKeys.length);
    console.log('Validation condition keys found:', validationKeys);
    
    validationKeys.forEach(key => {
        const data = localStorage.getItem(key);
        console.log(`Key: ${key}`);
        console.log(`Raw data: ${data}`);
        
        if (data) {
            try {
                const parsed = JSON.parse(data);
                console.log(`Parsed data:`, parsed);
                console.log(`Type:`, typeof parsed);
                console.log(`Length:`, Array.isArray(parsed) ? parsed.length : 'Not an array');
            } catch (error) {
                console.error(`Failed to parse data for key ${key}:`, error);
            }
        }
        console.log('---');
    });
}

// Function to check validation recommendations data
function checkValidationRecommendations() {
    console.log('\n--- Checking Validation Recommendations in localStorage ---');
    
    const allKeys = Object.keys(localStorage);
    const validationRecKeys = allKeys.filter(key => key.includes('validationRecommendations'));
    
    console.log('Validation recommendation keys found:', validationRecKeys);
    
    validationRecKeys.forEach(key => {
        const data = localStorage.getItem(key);
        console.log(`Key: ${key}`);
        
        if (data) {
            try {
                const parsed = JSON.parse(data);
                console.log(`Has data property:`, !!parsed.data);
                console.log(`Has reviewers:`, !!parsed.data?.reviewers);
                console.log(`Reviewer count:`, parsed.data?.reviewers?.length || 0);
                
                if (parsed.data?.reviewers?.length > 0) {
                    const sampleReviewer = parsed.data.reviewers[0];
                    console.log(`Sample reviewer keys:`, Object.keys(sampleReviewer));
                    console.log(`Sample reviewer email:`, sampleReviewer.email);
                }
            } catch (error) {
                console.error(`Failed to parse validation recommendations:`, error);
            }
        }
        console.log('---');
    });
}

// Function to simulate the shortlist service logic
function simulateShortlistService(processId) {
    console.log(`\n--- Simulating Shortlist Service for Process: ${processId} ---`);
    
    // Check for selected validation conditions
    const selectedConditionsKey = `process_${processId}_selectedValidationConditions`;
    const selectedConditionsData = localStorage.getItem(selectedConditionsKey);
    
    console.log(`Looking for key: ${selectedConditionsKey}`);
    console.log(`Found data: ${selectedConditionsData}`);
    
    let selectedValidationConditions;
    if (selectedConditionsData) {
        try {
            selectedValidationConditions = JSON.parse(selectedConditionsData);
            console.log('Parsed selected validation conditions:', selectedValidationConditions);
        } catch (error) {
            console.error('Failed to parse selected validation conditions:', error);
        }
    } else {
        console.log('No selected validation conditions found');
    }
    
    // Check for validation recommendations
    const validationKey = `process_${processId}_validationRecommendations`;
    const validationData = localStorage.getItem(validationKey);
    
    console.log(`Looking for validation data key: ${validationKey}`);
    console.log(`Found validation data: ${!!validationData}`);
    
    if (validationData) {
        try {
            const parsed = JSON.parse(validationData);
            console.log('Validation data structure:', Object.keys(parsed));
            console.log('Has reviewers:', !!parsed.data?.reviewers);
            console.log('Reviewer count:', parsed.data?.reviewers?.length || 0);
        } catch (error) {
            console.error('Failed to parse validation data:', error);
        }
    }
    
    return {
        selectedValidationConditions,
        hasValidationData: !!validationData
    };
}

// Function to test the export filtering logic
function testExportFiltering(selectedConditions) {
    console.log(`\n--- Testing Export Filtering with Conditions: ${JSON.stringify(selectedConditions)} ---`);
    
    // Mock validation condition columns mapping
    const VALIDATION_CONDITION_COLUMNS = {
        'Publications': [
            'Total_Publications',
            'Total_Publications_first', 
            'Total_Publications_last',
            'Publications_10_years',
            'Publications_10_years_first',
            'Publications_10_years_last',
            'Publications_2_years',
            'Publications_2_years_first',
            'Publications_2_years_last',
            'no_of_pub_condition_10_years',
            'no_of_pub_condition_2_years'
        ],
        'Coauthor': [
            'coauthor',
            'coauthor_condition'
        ],
        'Publication Types': [
            'English_Pubs',
            'english_ratio',
            'english_condition',
            'Clinical_Trials_no',
            'Clinical_study_no',
            'Case_reports_no',
            'Retracted_Pubs_no',
            'retracted_condition'
        ]
    };
    
    const baseHeaders = [
        'author', 'email', 'aff', 'city', 'country', 'conditions_met', 'conditions_satisfied'
    ];
    
    let conditionalHeaders = [];
    
    if (selectedConditions && selectedConditions.length > 0) {
        console.log('Processing selected conditions...');
        const selectedColumns = new Set();
        selectedConditions.forEach(condition => {
            const columns = VALIDATION_CONDITION_COLUMNS[condition];
            console.log(`Condition "${condition}" maps to:`, columns);
            if (columns) {
                columns.forEach(col => selectedColumns.add(col));
            }
        });
        conditionalHeaders = Array.from(selectedColumns);
        console.log('Selected columns:', conditionalHeaders);
    } else {
        console.log('No conditions specified, would use all columns');
        conditionalHeaders = ['Total_Publications', 'English_Pubs', 'coauthor', '...(all other columns)'];
    }
    
    const finalHeaders = [...baseHeaders, ...conditionalHeaders];
    console.log('Final headers:', finalHeaders);
    console.log('Total header count:', finalHeaders.length);
    
    return finalHeaders;
}

// Main debug function
function debugShortlistExport(processId) {
    if (!processId) {
        // Try to detect process ID from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        processId = urlParams.get('processId') || 'unknown';
        
        if (processId === 'unknown') {
            const allKeys = Object.keys(localStorage);
            const processKeys = allKeys.filter(key => key.startsWith('process_'));
            if (processKeys.length > 0) {
                const sampleKey = processKeys[0];
                const match = sampleKey.match(/^process_([^_]+)_/);
                if (match) {
                    processId = match[1];
                    console.log(`Detected process ID from localStorage: ${processId}`);
                }
            }
        }
    }
    
    console.log(`Starting debug for process ID: ${processId}`);
    
    checkValidationConditions();
    checkValidationRecommendations();
    
    const result = simulateShortlistService(processId);
    
    if (result.selectedValidationConditions) {
        testExportFiltering(result.selectedValidationConditions);
    } else {
        console.log('\nNo selected validation conditions found - export would include all columns');
        testExportFiltering(null);
    }
    
    return result;
}

// Auto-run the debug
debugShortlistExport();

// Make functions available globally for manual testing
window.debugShortlistExport = debugShortlistExport;
window.testExportFiltering = testExportFiltering;
window.checkValidationConditions = checkValidationConditions;

console.log('\n=== Debug functions available ===');
console.log('- debugShortlistExport(processId) - Main debug function');
console.log('- testExportFiltering(conditions) - Test filtering logic');
console.log('- checkValidationConditions() - Check localStorage for conditions');
console.log('Example: debugShortlistExport("your-process-id")');