// External API Response Types
// TypeScript interfaces for ScholarFinder external API responses

export interface UploadResponse {
  message: string;
  data: {
    job_id: string;
    file_name: string;
    timestamp: string;
    heading: string;
    authors: string[];
    affiliations: string[];
    keywords: string;
    abstract: string;
    author_aff_map: Record<string, string>;
  };
}

export interface MetadataResponse {
  message: string;
  job_id: string;
  data: {
    heading: string;
    authors: string[];
    affiliations: string[];
    keywords: string;
    abstract: string;
    author_aff_map: Record<string, string>;
  };
}

export interface KeywordEnhancementResponse {
  message: string;
  job_id: string;
  data: {
    mesh_terms: string[];
    broader_terms: string[];
    primary_focus: string[];
    secondary_focus: string[];
    additional_primary_keywords: string[];
    additional_secondary_keywords: string[];
    all_primary_focus_list: string[];
    all_secondary_focus_list: string[];
  };
}

export interface KeywordStringResponse {
  message: string;
  job_id: string;
  data: {
    search_string: string;
    primary_keywords_used: string[];
    secondary_keywords_used: string[];
  };
}

export interface DatabaseSearchResponse {
  message: string;
  job_id: string;
  data: {
    total_reviewers: number;
    databases_searched: string[];
    search_status: Record<string, 'success' | 'failed' | 'in_progress'>;
    preview_reviewers?: Reviewer[];
    reviewers_count?: number;
    keyword_string?: string;
    selected_websites?: string[];
    reviewers_raw_data_preview?: any[];
    author_email_affiliation_preview?: Array<{
      author: string;
      email: string;
      aff: string;
      city?: string;
      country?: string;
    }>;
  };
}

export interface ManualAuthorResponse {
  message: string;
  job_id: string;
  data: {
    found_authors: ManualAuthor[];
    search_term: string;
    total_found: number;
  };
}

// New interface for the actual /manual_authors endpoint response
export interface ManualAuthorSearchResponse {
  message: string;
  job_id: string;
  author_data: ManualAuthorData;
}

export interface ManualAuthorData {
  author: string;
  email: string;
  aff: string;
  city: string;
  country: string;
}

export interface ValidationResponse {
  message: string;
  job_id: string;
  data: {
    validation_status: 'in_progress' | 'completed' | 'failed';
    progress_percentage: number;
    estimated_completion_time?: string;
    total_authors_processed: number;
    validation_criteria: string[];
    summary?: ValidationSummary;
  };
}

export interface RecommendationsResponse {
  message: string;
  job_id: string;
  data: {
    reviewers: Reviewer[];
    total_count: number;
    validation_summary: ValidationSummary;
  };
}

export interface ValidationSummary {
  total_authors: number;
  authors_validated: number;
  conditions_applied: string[];
  average_conditions_met: number;
}

export interface ManualAuthor {
  name: string;
  email?: string;
  affiliation: string;
  country?: string;
  publications?: number;
}

export interface Reviewer {
  // Basic info
  reviewer: string;
  email: string;
  aff: string;
  city: string;
  country: string;
  
  // Total publications
  Total_Publications: number;
  Total_Publications_first: number;
  Total_Publications_last: number;
  
  // 10 years publications
  'Publications (last 10 years)': number;
  Publications_10_years: number;
  Publications_10_years_first: number;
  Publications_10_years_last: number;
  
  // 5 years publications
  Publications_5_years: number;
  Publications_5_years_first: number;
  Publications_5_years_last: number;
  'Relevant Publications (last 5 years)': number;
  Relevant_Publications_5_years: number;
  Relevant_Publications_5_years_first: number;
  Relevant_Publications_5_years_last: number;
  
  // 2 years publications
  'Publications (last 2 years)': number;
  Publications_2_years: number;
  Publications_2_years_first: number;
  Publications_2_years_last: number;
  Relevant_Primary_Pub_2_years: number;
  Relevant_Secondary_Pub_2_years: number;
  
  // Last year publications
  'Publications (last year)': number;
  Publications_last_year: number;
  Publications_last_year_first: number;
  Publications_last_year_last: number;
  
  // Specialized publications
  Clinical_Trials_no: number;
  Clinical_study_no: number;
  Case_reports_no: number;
  Retracted_Pubs_no: number;
  TF_Publications_last_year: number;
  
  // Language and quality
  English_Pubs: number;
  english_ratio: number;
  
  // Validation fields
  coauthor: boolean;
  country_match: string;
  aff_match: string;
  conditions_met: number;
  conditions_satisfied: string;
  
  // Validation condition flags
  no_of_pub_condition_10_years: number;
  no_of_pub_condition_5_years: number;
  no_of_pub_condition_2_years: number;
  english_condition: number;
  coauthor_condition: number;
  aff_condition: number;
  country_match_condition: number;
  retracted_condition: number;
}

// API Request Types
export interface KeywordSelection {
  primary_keywords_input: string;
  secondary_keywords_input: string;
}

export interface DatabaseSelection {
  selected_websites: string[];
}

export interface ManualAuthorRequest {
  author_name: string;
}

// Error Response Type
export interface ApiErrorResponse {
  message: string;
  error_code?: string;
  details?: any;
}