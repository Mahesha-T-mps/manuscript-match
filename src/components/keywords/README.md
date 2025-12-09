# Keyword Enhancement Component

The `KeywordEnhancement` component provides AI-powered keyword enhancement and search string generation for manuscript analysis workflows.

## Features

- **AI-Powered Enhancement**: Automatically generates enhanced keywords using external AI services
- **Multi-Category Keywords**: Organizes keywords into MeSH terms, broader terms, primary focus, and secondary focus
- **Interactive Selection**: Allows users to select and manage keywords for search string generation
- **Search String Generation**: Creates formatted Boolean query strings from selected keywords
- **Real-time Updates**: Immediate feedback on keyword selection and search string generation
- **Backend Integration**: Direct integration with ScholarFinder API

## Usage

```tsx
import { KeywordEnhancement } from '@/components/keywords/KeywordEnhancement';

const MyComponent = () => {
  const handleKeywordsEnhanced = (enhancedKeywords) => {
    console.log('Enhanced keywords:', enhancedKeywords);
  };

  const handleSearchStringGenerated = (searchString) => {
    console.log('Search string:', searchString);
  };

  return (
    <KeywordEnhancement
      processId="your-process-id"
      initialKeywords={['machine learning', 'AI']}
      onKeywordsEnhanced={handleKeywordsEnhanced}
      onSearchStringGenerated={handleSearchStringGenerated}
    />
  );
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `processId` | `string` | Yes | The ID of the process for keyword enhancement |
| `initialKeywords` | `string[]` | No | Initial keywords extracted from manuscript |
| `onKeywordsEnhanced` | `(keywords: EnhancedKeywords) => void` | No | Callback when keywords are enhanced |
| `onSearchStringGenerated` | `(searchString: string) => void` | No | Callback when search string is generated |

## Keyword Categories

The component organizes enhanced keywords into four categories:

### MeSH Terms
Medical Subject Headings used for indexing biomedical literature. These are standardized terms from the National Library of Medicine's controlled vocabulary.

### Broader Terms
General terms that encompass the research area. These help capture related research that may use different terminology.

### Primary Focus Keywords
Core keywords that directly relate to the main research topic. These are given higher weight in search string generation.

### Secondary Focus Keywords
Supporting keywords that provide context and help refine search results. These are combined with primary keywords using Boolean operators.

## Keyword Selection

### Selection Interface
- Checkboxes for each keyword category
- Visual indicators for selected keywords
- Count display showing number of selected keywords
- Clear all / Select all functionality

### Selection Rules
- At least one primary keyword must be selected
- Secondary keywords are optional but recommended
- Maximum of 10 primary keywords recommended
- Maximum of 15 secondary keywords recommended

## Search String Generation

### Boolean Query Format
The component generates search strings using Boolean operators:

```
(primary1 OR primary2 OR primary3) AND (secondary1 OR secondary2)
```

### Generation Process
1. User selects primary and secondary keywords
2. Click "Generate Search String" button
3. API processes keywords and creates optimized Boolean query
4. Search string is displayed with syntax highlighting
5. Keywords used are shown for reference

### Search String Features
- Proper Boolean operator placement
- Parentheses for logical grouping
- Database-specific syntax optimization
- Copy to clipboard functionality
- Edit and regenerate capability

## Backend Integration

The component integrates with ScholarFinder API endpoints:

### Enhance Keywords
```
POST https://192.168.61.60:8000/keyword_enhancement
Content-Type: application/json

{
  "job_id": "job_20250115_1430_a1b2c3"
}
```

**Response:**
```json
{
  "message": "Keywords enhanced successfully",
  "job_id": "job_20250115_1430_a1b2c3",
  "data": {
    "mesh_terms": ["Climate Change", "Biodiversity"],
    "broader_terms": ["Environmental Science", "Ecology"],
    "primary_focus": ["climate change", "global warming"],
    "secondary_focus": ["biodiversity", "species diversity"],
    "additional_primary_keywords": ["temperature rise"],
    "additional_secondary_keywords": ["habitat loss"],
    "all_primary_focus_list": ["climate change", "global warming", "temperature rise"],
    "all_secondary_focus_list": ["biodiversity", "species diversity", "habitat loss"]
  }
}
```

### Generate Search String
```
POST https://192.168.61.60:8000/keyword_string_generator
Content-Type: application/x-www-form-urlencoded

job_id=job_20250115_1430_a1b2c3
primary_keywords_input=climate change, global warming
secondary_keywords_input=biodiversity, species diversity
```

**Response:**
```json
{
  "message": "Search string generated successfully",
  "job_id": "job_20250115_1430_a1b2c3",
  "data": {
    "search_string": "(climate change OR global warming) AND (biodiversity OR species diversity)",
    "primary_keywords_used": ["climate change", "global warming"],
    "secondary_keywords_used": ["biodiversity", "species diversity"]
  }
}
```

## Error Handling

The component handles various error scenarios:

### Enhancement Errors
- **Network Errors**: Connection issues with retry options
- **Invalid Job ID**: Clear error message with guidance
- **API Errors**: Server-side processing failures
- **Timeout Errors**: Long-running enhancement operations

### Generation Errors
- **No Keywords Selected**: Validation before API call
- **Invalid Keyword Format**: Client-side validation
- **Generation Failures**: Retry with different keyword selection
- **Empty Results**: Fallback to manual entry

## Loading States

### Enhancement Loading
- Skeleton placeholders for keyword categories
- Animated loading indicators
- Progress feedback for long operations
- Cancel operation option

### Generation Loading
- Spinner on generate button
- Disabled form during generation
- Visual feedback for user actions
- Estimated completion time

## State Management

Uses React Query for efficient state management:

### Caching
- Enhanced keywords cached for session
- Search strings cached with keyword combinations
- Automatic cache invalidation on updates
- Optimistic updates for better UX

### Synchronization
- Real-time sync with backend
- Conflict resolution for concurrent edits
- Automatic retry on failures
- Background refetching

## Styling

Built with Tailwind CSS and shadcn/ui:

### Responsive Design
- Mobile-first approach
- Flexible grid layouts for keyword display
- Adaptive spacing and sizing
- Touch-friendly selection interface

### Visual Hierarchy
- Color-coded keyword categories
- Clear section separation
- Consistent typography
- Intuitive selection indicators

### Interactive Elements
- Hover states and transitions
- Focus management for accessibility
- Loading animations
- Success/error feedback

## Accessibility

Comprehensive accessibility features:

### Keyboard Navigation
- Tab order management
- Keyboard shortcuts for selection
- Focus indicators
- Enter to generate search string

### Screen Reader Support
- ARIA labels for all interactive elements
- Status announcements for async operations
- Semantic HTML structure
- Descriptive button labels

### Visual Accessibility
- High contrast support
- Scalable text and icons
- Clear visual feedback
- Color-blind friendly indicators

## Performance

Optimized for performance:

### Lazy Loading
- Conditional rendering based on data availability
- Efficient re-rendering with React.memo
- Memory management for large keyword sets

### Debounced Updates
- Prevents excessive API calls
- Smooth user experience
- Efficient network usage

### Caching Strategy
- Aggressive caching of enhanced keywords
- Smart cache invalidation
- Background updates

## Testing

Test the component with various scenarios:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeywordEnhancement } from './KeywordEnhancement';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQuery = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// Test keyword enhancement
test('enhances keywords successfully', async () => {
  renderWithQuery(
    <KeywordEnhancement 
      processId="test-id" 
      initialKeywords={['AI']} 
    />
  );
  
  await waitFor(() => {
    expect(screen.getByText(/mesh terms/i)).toBeInTheDocument();
  });
});

// Test keyword selection
test('allows keyword selection', async () => {
  renderWithQuery(<KeywordEnhancement processId="test-id" />);
  
  const checkbox = screen.getAllByRole('checkbox')[0];
  fireEvent.click(checkbox);
  
  expect(checkbox).toBeChecked();
});

// Test search string generation
test('generates search string', async () => {
  renderWithQuery(<KeywordEnhancement processId="test-id" />);
  
  // Select keywords
  const checkboxes = screen.getAllByRole('checkbox');
  fireEvent.click(checkboxes[0]);
  fireEvent.click(checkboxes[1]);
  
  // Generate search string
  const generateButton = screen.getByText(/generate search string/i);
  fireEvent.click(generateButton);
  
  await waitFor(() => {
    expect(screen.getByText(/search string/i)).toBeInTheDocument();
  });
});
```

## Integration with Workflow

### Previous Step: Data Extraction
- Receives initial keywords from metadata extraction
- Uses job_id from upload process
- Coordinates with ProcessWorkflow component

### Next Step: Database Search
- Provides enhanced keywords for search
- Passes generated search string to ReviewerSearch
- Maintains job_id throughout workflow

## Configuration

Configure behavior via environment variables:

```env
# API endpoints
VITE_SCHOLARFINDER_API_URL=https://192.168.61.60:8000

# Enhancement settings
VITE_MAX_PRIMARY_KEYWORDS=10
VITE_MAX_SECONDARY_KEYWORDS=15

# Cache settings
VITE_KEYWORD_CACHE_TIME=3600000  # 1 hour
```

## Related Components

- [`DataExtraction`](../extraction/README.md) - Provides initial keywords
- [`ReviewerSearch`](../search/README.md) - Uses enhanced keywords for search
- [`ProcessWorkflow`](../process/README.md) - Manages workflow progression
- [`KeywordService`](../../services/README.md) - Backend API integration

## Examples

See [`keywordEnhancementUsage.tsx`](../../examples/keywordEnhancementUsage.tsx) for complete integration examples.

## Requirements Fulfilled

This implementation fulfills the following requirements:

- **9.1**: Keyword enhancement API integration with job_id
- **9.2**: Enhanced keyword retrieval with multiple categories
- **9.3**: Keyword display organized by category
- **9.4**: Keyword selection for search string generation
- **10.1**: Search string generation enablement based on selection
- **10.2**: Search string API call with selected keywords
- **10.3**: Formatted Boolean query string display
- **10.4**: Display of keywords used in search string
- **10.5**: Error handling for keyword operations
