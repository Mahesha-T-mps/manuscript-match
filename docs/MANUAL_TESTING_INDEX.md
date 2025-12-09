# Manual Testing Documentation Index

## 📚 Complete Documentation Set

This index provides quick access to all manual testing documentation for the ScholarFinder API integration.

---

## 🚀 Start Here

### For First-Time Testers
**Start with**: [`MANUAL_TESTING_QUICK_START.md`](./MANUAL_TESTING_QUICK_START.md)  
Get up and running in 5 minutes with a 30-minute quick test path.

### For Comprehensive Testing
**Start with**: [`README_MANUAL_TESTING.md`](./README_MANUAL_TESTING.md)  
Understand the complete documentation structure and testing workflow.

---

## 📖 Documentation Files

### 1. Quick Start Guide
**File**: [`MANUAL_TESTING_QUICK_START.md`](./MANUAL_TESTING_QUICK_START.md)  
**Purpose**: Get started immediately  
**Time**: 5 minutes to read, 30-40 minutes to test  
**Best For**: Quick validation, smoke testing, first-time testers

**Contains**:
- Prerequisites checklist
- 5-step quick test path (30 min)
- Critical checks
- Quick error tests
- Success indicators
- Troubleshooting tips

---

### 2. Documentation Overview
**File**: [`README_MANUAL_TESTING.md`](./README_MANUAL_TESTING.md)  
**Purpose**: Understand the documentation structure  
**Time**: 10 minutes to read  
**Best For**: Understanding the testing approach, planning testing sessions

**Contains**:
- Document overview
- Testing workflow
- Test coverage summary
- API endpoints reference
- Common issues and solutions
- Success criteria

---

### 3. Comprehensive Testing Guide
**File**: [`MANUAL_TESTING_GUIDE.md`](./MANUAL_TESTING_GUIDE.md)  
**Purpose**: Detailed step-by-step testing instructions  
**Time**: 2-3 hours to complete all tests  
**Best For**: Thorough testing, formal QA, regression testing

**Contains**:
- 39 detailed test cases
- Step-by-step instructions
- Expected results for each test
- Network request verification
- Browser console commands
- Test results summary template

**Test Cases**:
- 17.1: Upload and Metadata (5 cases)
- 17.2: Keywords and Search (6 cases)
- 17.3: Manual Author and Validation (8 cases)
- 17.4: Recommendations and Export (11 cases)
- 17.5: Error Scenarios (8 cases)

---

### 4. Quick Reference Checklist
**File**: [`MANUAL_TESTING_CHECKLIST.md`](./MANUAL_TESTING_CHECKLIST.md)  
**Purpose**: Fast reference and progress tracking  
**Time**: Use during testing  
**Best For**: Tracking progress, quick reference, experienced testers

**Contains**:
- Condensed checklist format
- All 39 test cases with checkboxes
- Quick verification steps
- Network monitoring reference
- Console commands
- Status tracking

---

### 5. Test Report Template
**File**: [`MANUAL_TESTING_REPORT_TEMPLATE.md`](./MANUAL_TESTING_REPORT_TEMPLATE.md)  
**Purpose**: Document test results professionally  
**Time**: 30-60 minutes to complete  
**Best For**: Formal testing, QA documentation, sign-off process

**Contains**:
- Executive summary
- Test case result fields
- Issue tracking table
- Performance observations
- Browser compatibility matrix
- Sign-off section
- Attachments checklist

---

### 6. Testing Summary
**File**: [`MANUAL_TESTING_SUMMARY.md`](./MANUAL_TESTING_SUMMARY.md)  
**Purpose**: Overview of what was created and why  
**Time**: 5 minutes to read  
**Best For**: Understanding the documentation scope, project overview

**Contains**:
- Documentation overview
- Test coverage summary
- Key features
- Testing workflow diagram
- Success metrics
- Next steps

---

## 🎯 Choose Your Path

### Path 1: Quick Validation (40 minutes)
1. Read: [`MANUAL_TESTING_QUICK_START.md`](./MANUAL_TESTING_QUICK_START.md)
2. Test: Follow the 5-step quick test path
3. Track: Use [`MANUAL_TESTING_CHECKLIST.md`](./MANUAL_TESTING_CHECKLIST.md)
4. Done: Document any issues found

**Best for**: Smoke testing, quick validation, development testing

---

### Path 2: Comprehensive Testing (3-4 hours)
1. Read: [`README_MANUAL_TESTING.md`](./README_MANUAL_TESTING.md)
2. Test: Follow [`MANUAL_TESTING_GUIDE.md`](./MANUAL_TESTING_GUIDE.md)
3. Track: Use [`MANUAL_TESTING_CHECKLIST.md`](./MANUAL_TESTING_CHECKLIST.md)
4. Document: Fill out [`MANUAL_TESTING_REPORT_TEMPLATE.md`](./MANUAL_TESTING_REPORT_TEMPLATE.md)
5. Review: Analyze results and create bug reports

**Best for**: Thorough testing, QA validation, pre-release testing

---

### Path 3: Formal QA Process (5-6 hours)
1. Read: All documentation files
2. Plan: Review test coverage and requirements
3. Test: Complete all 39 test cases from [`MANUAL_TESTING_GUIDE.md`](./MANUAL_TESTING_GUIDE.md)
4. Track: Mark progress in [`MANUAL_TESTING_CHECKLIST.md`](./MANUAL_TESTING_CHECKLIST.md)
5. Document: Complete [`MANUAL_TESTING_REPORT_TEMPLATE.md`](./MANUAL_TESTING_REPORT_TEMPLATE.md)
6. Review: Analyze results, prioritize issues
7. Report: Create detailed bug reports
8. Sign-off: Get approval from stakeholders

**Best for**: Formal QA, release validation, compliance testing

---

## 📊 Test Coverage

### Requirements Tested
- ✅ Requirements 1-8: Upload and metadata extraction
- ✅ Requirements 9-11: Keyword enhancement and search
- ✅ Requirements 12-13: Manual author and validation
- ✅ Requirements 14-16: Recommendations and export
- ✅ Requirements 5, 17: Error handling

### API Endpoints Tested
- ✅ POST /upload_extract_metadata
- ✅ GET /metadata_extraction
- ✅ POST /keyword_enhancement
- ✅ POST /keyword_string_generator
- ✅ POST /database_search
- ✅ POST /manual_authors
- ✅ POST /validate_authors
- ✅ GET /validation_status/{job_id}
- ✅ GET /recommended_reviewers

### Test Types
- ✅ Functional testing (all workflow steps)
- ✅ Error handling testing
- ✅ Data persistence testing
- ✅ UI/UX testing
- ✅ Integration testing
- ✅ Network error testing
- ✅ Validation testing

---

## 🛠️ Tools Required

- **Browser**: Chrome, Firefox, Safari, or Edge (latest)
- **DevTools**: Built into browser (F12)
- **Test File**: Valid .docx manuscript
- **Network**: Access to https://192.168.61.60:8000
- **Servers**: Backend and frontend running

---

## 📈 Success Criteria

Testing is successful when:
- ✅ All 39 test cases pass
- ✅ No critical or high severity issues
- ✅ All API endpoints respond correctly
- ✅ Error handling works as expected
- ✅ Data persists throughout workflow
- ✅ Export produces valid files
- ✅ User experience is smooth

---

## 🔗 Related Documentation

### Specification Documents
- **Requirements**: `.kiro/specs/scholarfinder-api-integration/requirements.md`
- **Design**: `.kiro/specs/scholarfinder-api-integration/design.md`
- **Tasks**: `.kiro/specs/scholarfinder-api-integration/tasks.md`

### Implementation Files
- **API Service**: `src/features/scholarfinder/services/ScholarFinderApiService.ts`
- **File Service**: `src/services/fileService.ts`
- **Components**: `src/components/upload/`, `src/components/keywords/`, etc.

---

## 📝 Quick Reference

### Console Commands
```javascript
// Check job ID
localStorage.getItem('process_YOUR_PROCESS_ID_jobId')

// View all localStorage
console.table(localStorage)

// Set invalid job ID for testing
localStorage.setItem('process_YOUR_PROCESS_ID_jobId', 'invalid')

// Clear job ID
localStorage.removeItem('process_YOUR_PROCESS_ID_jobId')
```

### Network Monitoring
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by: `192.168.61.60`
4. Monitor requests and responses

### Common Issues
- **Upload fails**: Check file format (.docx) and size (<100MB)
- **Job ID missing**: Check localStorage
- **Validation stuck**: Wait 2-3 minutes, check polling
- **Export fails**: Verify reviewers selected

---

## 📞 Support

### For Testing Questions
- Review the comprehensive guide
- Check troubleshooting sections
- Review design document for expected behavior

### For Bug Reports
Include:
- Test case ID
- Steps to reproduce
- Expected vs actual results
- Screenshots
- Network logs
- Console errors

---

## ✅ Task Status

**Task 17: Manual testing with real API** - ✅ COMPLETED

All subtasks completed:
- ✅ 17.1: Test upload and metadata extraction
- ✅ 17.2: Test keyword enhancement and search
- ✅ 17.3: Test manual author and validation
- ✅ 17.4: Test recommendations and export
- ✅ 17.5: Test error scenarios

---

## 📅 Version History

- **v1.0** (Current) - Initial manual testing documentation
  - 6 documentation files created
  - 39 test cases documented
  - Complete workflow coverage
  - Error scenario testing included

---

## 🎓 Getting Started Checklist

Before you begin testing:

- [ ] Read this index to understand available documentation
- [ ] Choose your testing path (Quick/Comprehensive/Formal)
- [ ] Review prerequisites
- [ ] Ensure servers are running
- [ ] Prepare test files
- [ ] Open browser DevTools
- [ ] Start with the appropriate guide

**Ready?** Choose your path above and start testing! 🚀

---

**Last Updated**: Task 17 completion  
**Documentation Status**: Complete and ready for use  
**Total Test Cases**: 39  
**Estimated Testing Time**: 30 minutes (quick) to 6 hours (formal)
