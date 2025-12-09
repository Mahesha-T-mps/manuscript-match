# Accessibility Testing Guide
## ScholarFinder API Integration Workflow

**Purpose:** This guide provides step-by-step instructions for testing the accessibility of the ScholarFinder workflow components.

---

## Prerequisites

### Tools Required
- **Screen Reader**: NVDA (Windows) or VoiceOver (Mac)
- **Browser**: Chrome, Firefox, or Edge (latest version)
- **Browser Extensions**:
  - axe DevTools
  - WAVE Evaluation Tool
  - Lighthouse (built into Chrome DevTools)

### Test Environment
- Ensure you have a test manuscript file (.docx) ready
- Have a stable internet connection
- Clear browser cache before testing

---

## Manual Testing Procedures

### 1. Keyboard Navigation Test

**Objective:** Verify all interactive elements are keyboard accessible

#### Test Steps:
1. **Tab Navigation**
   - Press `Tab` to move forward through interactive elements
   - Press `Shift+Tab` to move backward
   - Verify focus indicator is visible on all elements
   - Verify tab order is logical (top to bottom, left to right)

2. **Enter/Space Activation**
   - Use `Enter` or `Space` to activate buttons
   - Use `Space` to toggle checkboxes
   - Use `Enter` to submit forms

3. **Arrow Key Navigation**
   - Use arrow keys in radio groups
   - Use arrow keys in select dropdowns
   - Use arrow keys in tabs

4. **Escape Key**
   - Press `Esc` to close dialogs
   - Press `Esc` to cancel operations

#### Expected Results:
- ✅ All interactive elements reachable via keyboard
- ✅ Focus indicator always visible
- ✅ Tab order is logical
- ✅ All actions can be performed without mouse

---

### 2. Screen Reader Test

**Objective:** Verify content is properly announced to screen reader users

#### NVDA (Windows) Test Steps:
1. **Start NVDA**: Press `Ctrl+Alt+N`
2. **Navigate by Headings**: Press `H` to jump between headings
3. **Navigate by Landmarks**: Press `D` to jump between landmarks
4. **Navigate by Forms**: Press `F` to jump between form fields
5. **Read All**: Press `Insert+Down Arrow` to read entire page

#### VoiceOver (Mac) Test Steps:
1. **Start VoiceOver**: Press `Cmd+F5`
2. **Navigate by Headings**: Press `VO+Cmd+H`
3. **Navigate by Landmarks**: Press `VO+U`, then use arrow keys
4. **Navigate by Forms**: Press `VO+Cmd+J`
5. **Read All**: Press `VO+A`

#### What to Listen For:
- ✅ Component names are announced clearly
- ✅ Button purposes are clear
- ✅ Form field labels are announced
- ✅ Error messages are announced
- ✅ Status updates are announced
- ✅ Progress indicators are announced

---

### 3. Component-Specific Tests

#### FileUpload Component
1. **Keyboard Test**:
   - Tab to file input
   - Press `Enter` to open file picker
   - Select file using keyboard
   - Verify upload progress is announced

2. **Screen Reader Test**:
   - Verify "Upload Manuscript" heading is announced
   - Verify file requirements are announced
   - Verify upload status is announced
   - Verify success/error messages are announced

#### DataExtraction Component
1. **Keyboard Test**:
   - Tab through metadata sections
   - Tab to Edit button and activate
   - Tab through form fields
   - Tab to Save button and activate

2. **Screen Reader Test**:
   - Verify section headings are announced
   - Verify form labels are announced
   - Verify save confirmation is announced

#### KeywordEnhancement Component
1. **Keyboard Test**:
   - Tab through keyword checkboxes
   - Use `Space` to toggle selection
   - Tab to Generate button and activate
   - Tab to Copy buttons and activate

2. **Screen Reader Test**:
   - Verify keyword categories are announced
   - Verify checkbox states are announced
   - Verify copy confirmation is announced
   - Verify generation status is announced

#### ReviewerSearch Component
1. **Keyboard Test**:
   - Tab through database checkboxes
   - Use `Space` to toggle selection
   - Tab to Search button and activate
   - Tab through manual search fields

2. **Screen Reader Test**:
   - Verify database names are announced
   - Verify search progress is announced
   - Verify search results are announced
   - Verify completion message is announced

#### AuthorValidation Component
1. **Keyboard Test**:
   - Tab to author name input
   - Type author name
   - Tab to Search button and activate
   - Tab through search results
   - Tab to Validate button and activate

2. **Screen Reader Test**:
   - Verify input label is announced
   - Verify validation errors are announced
   - Verify search results are announced
   - Verify validation progress is announced
   - Verify validation criteria are announced

#### ReviewerResults Component
1. **Keyboard Test**:
   - Tab through reviewer cards
   - Use `Space` to select reviewers
   - Tab through filter controls
   - Tab to Export button and activate

2. **Screen Reader Test**:
   - Verify reviewer names are announced
   - Verify validation scores are announced
   - Verify selection count is announced
   - Verify filter changes are announced

---

## Automated Testing

### 1. axe DevTools Test

#### Steps:
1. Open Chrome DevTools (`F12`)
2. Navigate to "axe DevTools" tab
3. Click "Scan ALL of my page"
4. Review results:
   - **Critical**: Must fix immediately
   - **Serious**: Should fix soon
   - **Moderate**: Should fix eventually
   - **Minor**: Nice to fix

#### Expected Results:
- ✅ 0 Critical issues
- ✅ 0 Serious issues
- ⚠️ < 5 Moderate issues
- ⚠️ < 10 Minor issues

### 2. WAVE Extension Test

#### Steps:
1. Install WAVE browser extension
2. Navigate to workflow page
3. Click WAVE icon in toolbar
4. Review:
   - **Errors** (red): Must fix
   - **Alerts** (yellow): Review carefully
   - **Features** (green): Good practices
   - **Structural Elements** (blue): Page structure
   - **ARIA** (purple): ARIA usage

#### Expected Results:
- ✅ 0 Errors
- ⚠️ < 5 Alerts
- ✅ All features properly implemented

### 3. Lighthouse Audit

#### Steps:
1. Open Chrome DevTools (`F12`)
2. Navigate to "Lighthouse" tab
3. Select "Accessibility" category
4. Click "Analyze page load"
5. Review score and recommendations

#### Expected Results:
- ✅ Accessibility Score: 90-100 (Good)
- ⚠️ Accessibility Score: 50-89 (Needs Improvement)
- ❌ Accessibility Score: 0-49 (Poor)

---

## Common Issues and Solutions

### Issue: Focus Not Visible
**Solution:** Add custom focus styles:
```css
*:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### Issue: Screen Reader Not Announcing Updates
**Solution:** Add `aria-live` region:
```jsx
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

### Issue: Button Purpose Unclear
**Solution:** Add `aria-label`:
```jsx
<Button aria-label="Remove uploaded file">
  <X className="w-4 h-4" />
</Button>
```

### Issue: Form Errors Not Announced
**Solution:** Add `aria-describedby` and `role="alert"`:
```jsx
<Input
  aria-describedby="error-message"
  aria-invalid={hasError}
/>
{hasError && (
  <p id="error-message" role="alert">
    {errorMessage}
  </p>
)}
```

---

## Test Checklist

### Before Release
- [ ] All components pass keyboard navigation test
- [ ] All components pass screen reader test
- [ ] axe DevTools shows 0 critical/serious issues
- [ ] WAVE shows 0 errors
- [ ] Lighthouse accessibility score > 90
- [ ] All forms have proper labels
- [ ] All buttons have clear purposes
- [ ] All images have alt text
- [ ] All icons are marked `aria-hidden="true"`
- [ ] All status updates use `aria-live`
- [ ] All loading states use `aria-busy`
- [ ] All dialogs trap focus properly
- [ ] All error messages are announced
- [ ] Color contrast meets WCAG AA standards

### Ongoing Monitoring
- [ ] Run automated tests in CI/CD pipeline
- [ ] Conduct quarterly manual accessibility audits
- [ ] Gather feedback from users with disabilities
- [ ] Update components based on feedback
- [ ] Document accessibility improvements

---

## Resources

### Documentation
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Testing Services
- [Accessibility Insights](https://accessibilityinsights.io/)
- [Pa11y](https://pa11y.org/)
- [Tenon.io](https://tenon.io/)

---

## Conclusion

Regular accessibility testing ensures the ScholarFinder workflow is usable by everyone, including users with disabilities. Follow this guide for each release and whenever significant changes are made to the UI.

**Remember:** Accessibility is not a one-time task—it's an ongoing commitment to inclusive design.
