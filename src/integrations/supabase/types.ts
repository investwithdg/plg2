export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      copy_generations: {
        Row: {
          batch_id: string | null;
          content: string;
          copy_type: string;
          created_at: string;
          fha_compliance_check: boolean;
          generation_latency_ms: number | null;
          generation_number: number | null;
          id: string;
          model_used: string | null;
          property_id: string;
          user_id: string | null;
        };
        Insert: {
          batch_id?: string | null;
          content: string;
          copy_type: string;
          created_at?: string;
          fha_compliance_check?: boolean;
          generation_latency_ms?: number | null;
          generation_number?: number | null;
          id?: string;
          model_used?: string | null;
          property_id: string;
          user_id?: string | null;
        };
        Update: {
          batch_id?: string | null;
          content?: string;
          copy_type?: string;
          created_at?: string;
          fha_compliance_check?: boolean;
          generation_latency_ms?: number | null;
          generation_number?: number | null;
          id?: string;
          model_used?: string | null;
          property_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "copy_generations_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      enrichment_cache: {
        Row: {
          cache_key: string;
          created_at: string;
          enrichment_data: Json;
          id: string;
          perplexity_raw: Json | null;
        };
        Insert: {
          cache_key: string;
          created_at?: string;
          enrichment_data?: Json;
          id?: string;
          perplexity_raw?: Json | null;
        };
        Update: {
          cache_key?: string;
          created_at?: string;
          enrichment_data?: Json;
          id?: string;
          perplexity_raw?: Json | null;
        };
        Relationships: [];
      };
      enrichments: {
        Row: {
          created_at: string;
          enrichment_latency_ms: number | null;
          enrichment_model_version: string | null;
          id: string;
          market_overview: string | null;
          median_home_value: number | null;
          nearby_amenities: Json | null;
          perplexity_raw_response: Json | null;
          property_id: string;
          schools: Json | null;
          transit_options: Json | null;
          walkability_score: number | null;
        };
        Insert: {
          created_at?: string;
          enrichment_latency_ms?: number | null;
          enrichment_model_version?: string | null;
          id?: string;
          market_overview?: string | null;
          median_home_value?: number | null;
          nearby_amenities?: Json | null;
          perplexity_raw_response?: Json | null;
          property_id: string;
          schools?: Json | null;
          transit_options?: Json | null;
          walkability_score?: number | null;
        };
        Update: {
          created_at?: string;
          enrichment_latency_ms?: number | null;
          enrichment_model_version?: string | null;
          id?: string;
          market_overview?: string | null;
          median_home_value?: number | null;
          nearby_amenities?: Json | null;
          perplexity_raw_response?: Json | null;
          property_id?: string;
          schools?: Json | null;
          transit_options?: Json | null;
          walkability_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "enrichments_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_costs: {
        Row: {
          copy_cost_usd: number | null;
          copy_input_tokens: number | null;
          copy_output_tokens: number | null;
          created_at: string;
          enrichment_cost_usd: number | null;
          enrichment_input_tokens: number | null;
          enrichment_output_tokens: number | null;
          extraction_cost_usd: number | null;
          extraction_input_tokens: number | null;
          extraction_output_tokens: number | null;
          id: string;
          property_id: string;
          total_cost_usd: number | null;
          total_input_tokens: number | null;
          total_output_tokens: number | null;
          user_id: string | null;
        };
        Insert: {
          copy_cost_usd?: number | null;
          copy_input_tokens?: number | null;
          copy_output_tokens?: number | null;
          created_at?: string;
          enrichment_cost_usd?: number | null;
          enrichment_input_tokens?: number | null;
          enrichment_output_tokens?: number | null;
          extraction_cost_usd?: number | null;
          extraction_input_tokens?: number | null;
          extraction_output_tokens?: number | null;
          id?: string;
          property_id: string;
          total_cost_usd?: number | null;
          total_input_tokens?: number | null;
          total_output_tokens?: number | null;
          user_id?: string | null;
        };
        Update: {
          copy_cost_usd?: number | null;
          copy_input_tokens?: number | null;
          copy_output_tokens?: number | null;
          created_at?: string;
          enrichment_cost_usd?: number | null;
          enrichment_input_tokens?: number | null;
          enrichment_output_tokens?: number | null;
          extraction_cost_usd?: number | null;
          extraction_input_tokens?: number | null;
          extraction_output_tokens?: number | null;
          id?: string;
          property_id?: string;
          total_cost_usd?: number | null;
          total_input_tokens?: number | null;
          total_output_tokens?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "generation_costs_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      properties: {
        Row: {
          address: string;
          baths: number | null;
          beds: number | null;
          created_at: string;
          dedupe_key: string | null;
          enrichment_step: string | null;
          extraction_latency_ms: number | null;
          extraction_model_version: string | null;
          extraction_status: string | null;
          failed_step: string | null;
          id: string;
          ip_hash: string | null;
          price: number | null;
          property_type: string | null;
          source: string | null;
          source_url: string | null;
          sqft: number | null;
          status: string;
          user_id: string | null;
        };
        Insert: {
          address: string;
          baths?: number | null;
          beds?: number | null;
          created_at?: string;
          dedupe_key?: string | null;
          enrichment_step?: string | null;
          extraction_latency_ms?: number | null;
          extraction_model_version?: string | null;
          extraction_status?: string | null;
          failed_step?: string | null;
          id?: string;
          ip_hash?: string | null;
          price?: number | null;
          property_type?: string | null;
          source?: string | null;
          source_url?: string | null;
          sqft?: number | null;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          address?: string;
          baths?: number | null;
          beds?: number | null;
          created_at?: string;
          dedupe_key?: string | null;
          enrichment_step?: string | null;
          extraction_latency_ms?: number | null;
          extraction_model_version?: string | null;
          extraction_status?: string | null;
          failed_step?: string | null;
          id?: string;
          ip_hash?: string | null;
          price?: number | null;
          property_type?: string | null;
          source?: string | null;
          source_url?: string | null;
          sqft?: number | null;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan: string;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          trial_end: string | null;
          trial_start: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          trial_end?: string | null;
          trial_start?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          trial_end?: string | null;
          trial_start?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
