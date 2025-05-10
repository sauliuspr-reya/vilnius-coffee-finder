export interface ChatGPTStructuredData {
  place_name?: string; // This was in your example, though 'placeName' prop is also used
  summary_for_display: string;
  chatgpt_rating?: string;
  ongoing_events?: string;
  sentiment_analysis?: string;
  special_features?: string;
  atmosphere?: {
    vibe?: string;
    decor_style?: string;
    good_for_work_study?: boolean;
  };
  coffee_program?: {
    bean_source_quality?: string;
    brewing_methods_available?: string[];
    signature_drinks?: string[];
    milk_alternatives_offered?: string[];
  };
  food_offerings?: {
    types_available?: string[];
    specific_popular_items?: string[];
  };
  key_selling_points?: string[];
  primary_target_audience?: string[]; // This is an array in your example
  error?: string; // For API response error handling
}
