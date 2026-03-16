// Debug script to check shortlist data mapping
// Run this in browser console while on the shortlist page

console.log('=== Shortlist Data Mapping Debug ===');

// Function to inspect reviewer data structure
function inspectReviewerData() {
    console.log('\n--- Inspecting Reviewer Data Structure ---');
    
    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    console.log('All localStorage keys:', allKeys.length);
    
    // Find process-related keys
    const processKeys = allKeys.filter(key => key.startsWith('process_'));
    console.log('Process keys found:', processKeys);
    
    processKeys.forEach(key => {
        if (key.includes('validationRecommendations') || key.includes('recommendations')) {
            console.log(`\n--- Checking ${key} ---`);
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    console.log('Data structure:', Object.keys(parsed));
                    
                    let reviewers = [];
                    if (parsed.data?.reviewers) {
                        reviewers = parsed.data.reviewers;
                    } else if (parsed.reviewers) {
                        reviewers = parsed.reviewers;
                    }
                    
                    if (reviewers.length > 0) {
                        console.log('Number of reviewers:', reviewers.length);
                        console.log('Sample reviewer keys:', Object.keys(reviewers[0]));
                        console.log('Sample reviewer data:');
                        
                        const sample = reviewers[0];
                        console.log('- Name/Reviewer:', sample.name || sample.reviewer);
                        console.log('- Email:', sample.email);
                        console.log('- Total_Publications:', sample.Total_Publications);
                        console.log('- publications:', sample.publications);
                        console.log('- Publications_10_years:', sample.Publications_10_years);
                        console.log('- Publications (last 10 years):', sample['Publications (last 10 years)']);
                        console.log('- English_Pubs:', sample.English_Pubs);
                        console.log('- english_pubs:', sample.english_pubs);
                        console.log('- Clinical_Trials_no:', sample.Clinical_Trials_no);
                        console.log('- clinical_trials:', sample.clinical_trials);
                        console.log('- coauthor:', sample.coauthor);
                        console.log('- conditions_met:', sample.conditions_met);
                    }
                } catch (error) {
                    console.error('Failed to parse data:', error);
                }
            }
        }
    });
}

// Function to test the normalization logic
function testNormalization() {
    console.log('\n--- Testing Normalization Logic ---');
    
    // Get a sample reviewer from localStorage
    const processKeys = Object.keys(localStorage).filter(key => 
        key.includes('validationRecommendations') || key.includes('recommendations')
    );
    
    let sampleReviewer = null;
    for (const key of processKeys) {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                const reviewers = parsed.data?.reviewers || parsed.reviewers || [];
                if (reviewers.length > 0) {
                    sampleReviewer = reviewers[0];
                    console.log('Using sample reviewer from:', key);
                    break;
                }
            } catch (error) {
                continue;
            }
        }
    }
    
    if (!sampleReviewer) {
        console.log('No sample reviewer found in localStorage');
        return;
    }
    
    console.log('Original reviewer data:', sampleReviewer);
    
    // Simulate the normalization logic
    const normalized = {
        // Basic info
        reviewer: sampleReviewer.reviewer || sampleReviewer.name || 'Unknown',
        email: sampleReviewer.email || '',
        aff: sampleReviewer.aff || sampleReviewer.affiliation || '',
        city: sampleReviewer.city || '',
        country: sampleReviewer.country || '',
        
        // Conditions
        conditions_met: sampleReviewer.conditions_met || 0,
        conditions_satisfied: sampleReviewer.conditions_satisfied || '',
        
        // Total publications
        Total_Publications: sampleReviewer.Total_Publications || sampleReviewer.publications || 0,
        
        // 10 years publications
        'Publications (last 10 years)': sampleReviewer['Publications (last 10 years)'] || sampleReviewer.Publications_10_years || 0,
        Publications_10_years: sampleReviewer.Publications_10_years || sampleReviewer['Publications (last 10 years)'] || 0,
        
        // English publications
        English_Pubs: sampleReviewer.English_Pubs || sampleReviewer.english_pubs || 0,
        
        // Clinical trials
        Clinical_Trials_no: sampleReviewer.Clinical_Trials_no || sampleReviewer.clinical_trials || 0,
        
        // Coauthor
        coauthor: sampleReviewer.coauthor || false
    };
    
    console.log('Normalized reviewer data:', normalized);
    
    // Compare key fields
    console.log('\n--- Field Mapping Comparison ---');
    console.log('Name: Original =', sampleReviewer.name || sampleReviewer.reviewer, '| Normalized =', normalized.reviewer);
    console.log('Publications: Original =', sampleReviewer.Total_Publications || sampleReviewer.publications, '| Normalized =', normalized.Total_Publications);
    console.log('10yr Pubs: Original =', sampleReviewer['Publications (last 10 years)'] || sampleReviewer.Publications_10_years, '| Normalized =', normalized.Publications_10_years);
    console.log('English: Original =', sampleReviewer.English_Pubs || sampleReviewer.english_pubs, '| Normalized =', normalized.English_Pubs);
    console.log('Clinical: Original =', sampleReviewer.Clinical_Trials_no || sampleReviewer.clinical_trials, '| Normalized =', normalized.Clinical_Trials_no);
}

// Function to simulate CSV generation
function simulateCSVGeneration() {
    console.log('\n--- Simulating CSV Generation ---');
    
    // Mock validation conditions
    const selectedConditions = ['Publications', 'Coauthor', 'Publication Types'];
    console.log('Selected conditions:', selectedConditions);
    
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
    
    // Base headers
    const baseHeaders = [
        'author', 'email', 'aff', 'city', 'country', 'conditions_met', 'conditions_satisfied'
    ];
    
    // Get conditional headers
    const selectedColumns = new Set();
    selectedConditions.forEach(condition => {
        const columns = VALIDATION_CONDITION_COLUMNS[condition];
        if (columns) {
            columns.forEach(col => selectedColumns.add(col));
        }
    });
    const conditionalHeaders = Array.from(selectedColumns);
    
    const finalHeaders = [...baseHeaders, ...conditionalHeaders];
    
    console.log('Base headers:', baseHeaders);
    console.log('Conditional headers:', conditionalHeaders);
    console.log('Final headers:', finalHeaders);
    console.log('Total header count:', finalHeaders.length);
    
    return finalHeaders;
}

// Function to check what's actually being exported
function checkExportData() {
    console.log('\n--- Checking Export Data ---');
    
    // Override the generateCSV function temporarily to log data
    if (window.generateCSV) {
        const originalGenerateCSV = window.generateCSV;
        window.generateCSV = function(reviewers, selectedConditions) {
            console.log('generateCSV called with:');
            console.log('- Reviewers count:', reviewers.length);
            console.log('- Selected conditions:', selectedConditions);
            console.log('- First reviewer data:', reviewers[0]);
            
            return originalGenerateCSV(reviewers, selectedConditions);
        };
        console.log('Overrode generateCSV function for debugging');
    } else {
        console.log('generateCSV function not found in window');
    }
}

// Main debug function
function debugShortlistDataMapping() {
    inspectReviewerData();
    testNormalization();
    simulateCSVGeneration();
    checkExportData();
    
    console.log('\n=== Debug Complete ===');
    console.log('Now try exporting from shortlist and check console for additional logs');
}

// Run the debug
debugShortlistDataMapping();

// Make functions available for manual testing
window.inspectReviewerData = inspectReviewerData;
window.testNormalization = testNormalization;
window.simulateCSVGeneration = simulateCSVGeneration;
window.debugShortlistDataMapping = debugShortlistDataMapping;

console.log('\n=== Functions Available ===');
console.log('- inspectReviewerData() - Check reviewer data structure');
console.log('- testNormalization() - Test field mapping');
console.log('- simulateCSVGeneration() - Test CSV header generation');
console.log('- debugShortlistDataMapping() - Run all tests');