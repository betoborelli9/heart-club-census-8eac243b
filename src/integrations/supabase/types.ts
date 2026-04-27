export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ambassador_levels: {
        Row: {
          created_at: string
          id: string
          level: string
          referral_count: number
          scope_type: string
          scope_value: string
          social_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          referral_count?: number
          scope_type: string
          scope_value: string
          social_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          referral_count?: number
          scope_type?: string
          scope_value?: string
          social_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      club_colors: {
        Row: {
          accent_color: string | null
          api_id: number | null
          club_name: string
          conflict_reported: boolean
          created_at: string
          id: string
          is_locked: boolean
          primary_color: string
          primary_color_name: string | null
          secondary_color: string
          secondary_color_name: string | null
          suggested_by: string | null
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          accent_color?: string | null
          api_id?: number | null
          club_name: string
          conflict_reported?: boolean
          created_at?: string
          id?: string
          is_locked?: boolean
          primary_color?: string
          primary_color_name?: string | null
          secondary_color?: string
          secondary_color_name?: string | null
          suggested_by?: string | null
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          accent_color?: string | null
          api_id?: number | null
          club_name?: string
          conflict_reported?: boolean
          created_at?: string
          id?: string
          is_locked?: boolean
          primary_color?: string
          primary_color_name?: string | null
          secondary_color?: string
          secondary_color_name?: string | null
          suggested_by?: string | null
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: []
      }
      club_corrections: {
        Row: {
          ai_reasoning: string | null
          ai_verdict: string | null
          applied_value: string | null
          clube_nome: string
          created_at: string
          field_name: string
          id: string
          old_value: string | null
          status: string
          suggested_value: string | null
          user_display_name: string | null
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          ai_verdict?: string | null
          applied_value?: string | null
          clube_nome: string
          created_at?: string
          field_name: string
          id?: string
          old_value?: string | null
          status?: string
          suggested_value?: string | null
          user_display_name?: string | null
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          ai_verdict?: string | null
          applied_value?: string | null
          clube_nome?: string
          created_at?: string
          field_name?: string
          id?: string
          old_value?: string | null
          status?: string
          suggested_value?: string | null
          user_display_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clubes_cache: {
        Row: {
          api_id: string | null
          atualizado_em: string | null
          cidade: string
          cor_primaria: string | null
          cor_quarta: string | null
          cor_secundaria: string | null
          cor_terciaria: string | null
          division: string | null
          escudo_url: string | null
          estadio_capacidade: number | null
          estadio_cidade: string | null
          estadio_nome: string | null
          feminino: boolean | null
          fundado: number | null
          id: number
          mascote: string | null
          nome: string
          nome_curto: string | null
          pais: string
          tem_feminino: boolean | null
        }
        Insert: {
          api_id?: string | null
          atualizado_em?: string | null
          cidade: string
          cor_primaria?: string | null
          cor_quarta?: string | null
          cor_secundaria?: string | null
          cor_terciaria?: string | null
          division?: string | null
          escudo_url?: string | null
          estadio_capacidade?: number | null
          estadio_cidade?: string | null
          estadio_nome?: string | null
          feminino?: boolean | null
          fundado?: number | null
          id?: number
          mascote?: string | null
          nome: string
          nome_curto?: string | null
          pais: string
          tem_feminino?: boolean | null
        }
        Update: {
          api_id?: string | null
          atualizado_em?: string | null
          cidade?: string
          cor_primaria?: string | null
          cor_quarta?: string | null
          cor_secundaria?: string | null
          cor_terciaria?: string | null
          division?: string | null
          escudo_url?: string | null
          estadio_capacidade?: number | null
          estadio_cidade?: string | null
          estadio_nome?: string | null
          feminino?: boolean | null
          fundado?: number | null
          id?: number
          mascote?: string | null
          nome?: string
          nome_curto?: string | null
          pais?: string
          tem_feminino?: boolean | null
        }
        Relationships: []
      }
      clubes_override: {
        Row: {
          cor_primaria: string | null
          cor_secundaria: string | null
          cor_terciaria: string | null
          has_feminino: boolean | null
          id: number
          mascote: string | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          cor_primaria?: string | null
          cor_secundaria?: string | null
          cor_terciaria?: string | null
          has_feminino?: boolean | null
          id?: never
          mascote?: string | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          cor_primaria?: string | null
          cor_secundaria?: string | null
          cor_terciaria?: string | null
          has_feminino?: boolean | null
          id?: never
          mascote?: string | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      indicacoes: {
        Row: {
          codigo_usado: string | null
          created_at: string | null
          embaixador_id: string | null
          id: string
          indicado_id: string | null
        }
        Insert: {
          codigo_usado?: string | null
          created_at?: string | null
          embaixador_id?: string | null
          id?: string
          indicado_id?: string | null
        }
        Update: {
          codigo_usado?: string | null
          created_at?: string | null
          embaixador_id?: string | null
          id?: string
          indicado_id?: string | null
        }
        Relationships: []
      }
      lista_profissoes: {
        Row: {
          id: number
          nome: string
        }
        Insert: {
          id?: number
          nome: string
        }
        Update: {
          id?: number
          nome?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cidade: string | null
          classe_social: string | null
          codigo_indicacao: string | null
          data_nascimento: string | null
          device_hardware: string | null
          estado: string | null
          faixa_etaria: string | null
          genero: string | null
          id: string
          nivel_embaixador: string | null
          nome_exibicao: string | null
          pais: string | null
          profissao: string | null
          role: string | null
          telefone: string | null
          username: string | null
        }
        Insert: {
          cidade?: string | null
          classe_social?: string | null
          codigo_indicacao?: string | null
          data_nascimento?: string | null
          device_hardware?: string | null
          estado?: string | null
          faixa_etaria?: string | null
          genero?: string | null
          id: string
          nivel_embaixador?: string | null
          nome_exibicao?: string | null
          pais?: string | null
          profissao?: string | null
          role?: string | null
          telefone?: string | null
          username?: string | null
        }
        Update: {
          cidade?: string | null
          classe_social?: string | null
          codigo_indicacao?: string | null
          data_nascimento?: string | null
          device_hardware?: string | null
          estado?: string | null
          faixa_etaria?: string | null
          genero?: string | null
          id?: string
          nivel_embaixador?: string | null
          nome_exibicao?: string | null
          pais?: string | null
          profissao?: string | null
          role?: string | null
          telefone?: string | null
          username?: string | null
        }
        Relationships: []
      }
      votos: {
        Row: {
          cidade: string
          clube_nome: string
          created_at: string | null
          estado: string
          fingerprint: string | null
          id: string
          ip_address: string | null
          is_fraud_attempt: boolean
          is_original_vote: boolean
          is_suspicious: boolean | null
          pais: string
          user_id: string
        }
        Insert: {
          cidade: string
          clube_nome: string
          created_at?: string | null
          estado: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_fraud_attempt?: boolean
          is_original_vote?: boolean
          is_suspicious?: boolean | null
          pais: string
          user_id: string
        }
        Update: {
          cidade?: string
          clube_nome?: string
          created_at?: string | null
          estado?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_fraud_attempt?: boolean
          is_original_vote?: boolean
          is_suspicious?: boolean | null
          pais?: string
          user_id?: string
        }
        Relationships: []
      }
      votos_tracking: {
        Row: {
          created_at: string | null
          fingerprint: string | null
          id: string
          ip_address: string | null
          is_suspicious: boolean | null
          voto_id: string
        }
        Insert: {
          created_at?: string | null
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          voto_id: string
        }
        Update: {
          created_at?: string | null
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          voto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votos_tracking_voto_id_fkey"
            columns: ["voto_id"]
            isOneToOne: false
            referencedRelation: "votos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_clean_fraud_by_fingerprint: {
        Args: never
        Returns: {
          deleted_count: number
          marked_count: number
        }[]
      }
      admin_get_bi_stats: { Args: never; Returns: Json }
      admin_get_votes_with_tracking: {
        Args: never
        Returns: {
          cidade: string
          clube_nome: string
          created_at: string
          estado: string
          fingerprint: string
          ip_address: string
          is_fraud_attempt: boolean
          is_original_vote: boolean
          is_suspicious: boolean
          pais: string
          user_email: string
          user_genero: string
          user_id: string
          user_nascimento: string
          user_nome: string
          user_profissao: string
          voto_id: string
        }[]
      }
      get_heatmap_data: {
        Args: { p_club_name: string; p_filter_value?: string; p_level?: string }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
