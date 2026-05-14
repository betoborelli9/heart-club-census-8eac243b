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
      api_competitions_cache: {
        Row: {
          last_update: string | null
          league_id: number
          league_logo: string | null
          league_name: string | null
          season: number
          standings_json: Json | null
          team_id: number
        }
        Insert: {
          last_update?: string | null
          league_id: number
          league_logo?: string | null
          league_name?: string | null
          season: number
          standings_json?: Json | null
          team_id: number
        }
        Update: {
          last_update?: string | null
          league_id?: number
          league_logo?: string | null
          league_name?: string | null
          season?: number
          standings_json?: Json | null
          team_id?: number
        }
        Relationships: []
      }
      api_fixtures_cache: {
        Row: {
          fixture_data: Json | null
          last_update: string | null
          next_match_data: Json | null
          team_id: number
        }
        Insert: {
          fixture_data?: Json | null
          last_update?: string | null
          next_match_data?: Json | null
          team_id: number
        }
        Update: {
          fixture_data?: Json | null
          last_update?: string | null
          next_match_data?: Json | null
          team_id?: number
        }
        Relationships: []
      }
      auth_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
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
      clube_rivalidades_cache: {
        Row: {
          clube_id: string | null
          clube_nome: string
          rival_emblema: string | null
          rival_nome: string
          updated_at: string | null
        }
        Insert: {
          clube_id?: string | null
          clube_nome: string
          rival_emblema?: string | null
          rival_nome: string
          updated_at?: string | null
        }
        Update: {
          clube_id?: string | null
          clube_nome?: string
          rival_emblema?: string | null
          rival_nome?: string
          updated_at?: string | null
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
          rivais: string[] | null
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
          rivais?: string[] | null
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
          rivais?: string[] | null
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
      clubes_ranking_rapido: {
        Row: {
          escudo_url: string | null
          id: string
          nome: string | null
          nome_curto: string | null
          search_vector: unknown
        }
        Insert: {
          escudo_url?: string | null
          id?: string
          nome?: string | null
          nome_curto?: string | null
          search_vector?: unknown
        }
        Update: {
          escudo_url?: string | null
          id?: string
          nome?: string | null
          nome_curto?: string | null
          search_vector?: unknown
        }
        Relationships: []
      }
      competition_standings_cache: {
        Row: {
          group_name: string | null
          league_id: number
          league_name: string | null
          season: number
          standings_json: Json | null
          updated_at: string | null
        }
        Insert: {
          group_name?: string | null
          league_id: number
          league_name?: string | null
          season: number
          standings_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          group_name?: string | null
          league_id?: number
          league_name?: string | null
          season?: number
          standings_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      geo_neighborhood_cache: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          neighborhood: string
          osm_id: number | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          id?: string
          neighborhood: string
          osm_id?: number | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          neighborhood?: string
          osm_id?: number | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      global_standings_cache: {
        Row: {
          last_update: string | null
          league_id: number
          season: number
          standings_data: Json | null
        }
        Insert: {
          last_update?: string | null
          league_id: number
          season: number
          standings_data?: Json | null
        }
        Update: {
          last_update?: string | null
          league_id?: number
          season?: number
          standings_data?: Json | null
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
      partner_clicks: {
        Row: {
          bairro: string | null
          cidade: string | null
          created_at: string
          estado: string | null
          id: string
          lat: number | null
          lng: number | null
          pais: string | null
          partner_id: string
          partner_name: string | null
          referrer_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          pais?: string | null
          partner_id: string
          partner_name?: string | null
          referrer_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          pais?: string | null
          partner_id?: string
          partner_name?: string | null
          referrer_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_confirmed: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          classe_social: string | null
          codigo_indicacao: string | null
          data_nascimento: string | null
          device_hardware: string | null
          estado: string | null
          faixa_etaria: string | null
          genero: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          nivel_embaixador: string | null
          nome_exibicao: string | null
          occupation: string | null
          pais: string | null
          profissao: string | null
          role: string | null
          telefone: string | null
          username: string | null
          votos_time: string | null
        }
        Insert: {
          address_confirmed?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          classe_social?: string | null
          codigo_indicacao?: string | null
          data_nascimento?: string | null
          device_hardware?: string | null
          estado?: string | null
          faixa_etaria?: string | null
          genero?: string | null
          id: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          nivel_embaixador?: string | null
          nome_exibicao?: string | null
          occupation?: string | null
          pais?: string | null
          profissao?: string | null
          role?: string | null
          telefone?: string | null
          username?: string | null
          votos_time?: string | null
        }
        Update: {
          address_confirmed?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          classe_social?: string | null
          codigo_indicacao?: string | null
          data_nascimento?: string | null
          device_hardware?: string | null
          estado?: string | null
          faixa_etaria?: string | null
          genero?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          nivel_embaixador?: string | null
          nome_exibicao?: string | null
          occupation?: string | null
          pais?: string | null
          profissao?: string | null
          role?: string | null
          telefone?: string | null
          username?: string | null
          votos_time?: string | null
        }
        Relationships: []
      }
      team_active_competitions: {
        Row: {
          competitions_json: Json | null
          last_sync: string | null
          team_id: number
          team_name: string | null
        }
        Insert: {
          competitions_json?: Json | null
          last_sync?: string | null
          team_id: number
          team_name?: string | null
        }
        Update: {
          competitions_json?: Json | null
          last_sync?: string | null
          team_id?: number
          team_name?: string | null
        }
        Relationships: []
      }
      team_fixtures_cache: {
        Row: {
          payload: Json | null
          team_id: number
          updated_at: string | null
        }
        Insert: {
          payload?: Json | null
          team_id: number
          updated_at?: string | null
        }
        Update: {
          payload?: Json | null
          team_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      team_leagues_mapping: {
        Row: {
          leagues_json: Json | null
          team_id: number
          team_name: string | null
          updated_at: string | null
        }
        Insert: {
          leagues_json?: Json | null
          team_id: number
          team_name?: string | null
          updated_at?: string | null
        }
        Update: {
          leagues_json?: Json | null
          team_id?: number
          team_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          page_url: string | null
          type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          page_url?: string | null
          type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          page_url?: string | null
          type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      votos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string
          clube_nome: string
          cluster_id: string | null
          complemento: string | null
          country_code: string | null
          created_at: string | null
          device_model: string | null
          email: string | null
          estado: string
          fingerprint: string | null
          id: string
          ip_address: string | null
          is_fraud_attempt: boolean
          is_original_vote: boolean
          is_residente: boolean | null
          is_suspicious: boolean | null
          isp: string | null
          latitude: number | null
          longitude: number | null
          motivo_suspicao: string | null
          numero: string | null
          pais: string
          potential_duplicate_user: boolean
          status_aprovacao: string
          status_integridade: string | null
          sympathy_1: string | null
          sympathy_2: string | null
          sympathy_3: string | null
          sympathy_4: string | null
          user_id: string
          voto_bairro_gps: string | null
          voto_cidade: string | null
          voto_cidade_gps: string | null
          voto_continente: string | null
          voto_ip: string | null
          voto_lat: number | null
          voto_lng: number | null
          voto_pais: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade: string
          clube_nome: string
          cluster_id?: string | null
          complemento?: string | null
          country_code?: string | null
          created_at?: string | null
          device_model?: string | null
          email?: string | null
          estado: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_fraud_attempt?: boolean
          is_original_vote?: boolean
          is_residente?: boolean | null
          is_suspicious?: boolean | null
          isp?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo_suspicao?: string | null
          numero?: string | null
          pais: string
          potential_duplicate_user?: boolean
          status_aprovacao?: string
          status_integridade?: string | null
          sympathy_1?: string | null
          sympathy_2?: string | null
          sympathy_3?: string | null
          sympathy_4?: string | null
          user_id: string
          voto_bairro_gps?: string | null
          voto_cidade?: string | null
          voto_cidade_gps?: string | null
          voto_continente?: string | null
          voto_ip?: string | null
          voto_lat?: number | null
          voto_lng?: number | null
          voto_pais?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string
          clube_nome?: string
          cluster_id?: string | null
          complemento?: string | null
          country_code?: string | null
          created_at?: string | null
          device_model?: string | null
          email?: string | null
          estado?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_fraud_attempt?: boolean
          is_original_vote?: boolean
          is_residente?: boolean | null
          is_suspicious?: boolean | null
          isp?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo_suspicao?: string | null
          numero?: string | null
          pais?: string
          potential_duplicate_user?: boolean
          status_aprovacao?: string
          status_integridade?: string | null
          sympathy_1?: string | null
          sympathy_2?: string | null
          sympathy_3?: string | null
          sympathy_4?: string | null
          user_id?: string
          voto_bairro_gps?: string | null
          voto_cidade?: string | null
          voto_cidade_gps?: string | null
          voto_continente?: string | null
          voto_ip?: string | null
          voto_lat?: number | null
          voto_lng?: number | null
          voto_pais?: string | null
        }
        Relationships: []
      }
      votos_ficticios_meta: {
        Row: {
          codigo_indicacao: string
          created_at: string
          id: string
          indicado_por: string | null
          nome_exibicao: string
          user_id: string
        }
        Insert: {
          codigo_indicacao: string
          created_at?: string
          id?: string
          indicado_por?: string | null
          nome_exibicao: string
          user_id: string
        }
        Update: {
          codigo_indicacao?: string
          created_at?: string
          id?: string
          indicado_por?: string | null
          nome_exibicao?: string
          user_id?: string
        }
        Relationships: []
      }
      votos_lixeira: {
        Row: {
          bairro: string | null
          cidade: string | null
          clube_nome: string | null
          cluster_id: string | null
          estado: string | null
          id: string
          isp: string | null
          moved_at: string
          original_voto_id: string
          pais: string | null
          payload: Json | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          bairro?: string | null
          cidade?: string | null
          clube_nome?: string | null
          cluster_id?: string | null
          estado?: string | null
          id?: string
          isp?: string | null
          moved_at?: string
          original_voto_id: string
          pais?: string | null
          payload?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          bairro?: string | null
          cidade?: string | null
          clube_nome?: string | null
          cluster_id?: string | null
          estado?: string | null
          id?: string
          isp?: string | null
          moved_at?: string
          original_voto_id?: string
          pais?: string | null
          payload?: Json | null
          reason?: string | null
          user_id?: string | null
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
      admin_approve_vote: { Args: { p_voto_id: string }; Returns: undefined }
      admin_clean_fraud_by_fingerprint: {
        Args: never
        Returns: {
          deleted_count: number
          marked_count: number
        }[]
      }
      admin_delete_vote: { Args: { p_voto_id: string }; Returns: undefined }
      admin_detect_vote_clusters: { Args: never; Returns: Json }
      admin_flag_isp_clusters: { Args: { p_threshold?: number }; Returns: Json }
      admin_flag_suspicious_devices: { Args: never; Returns: number }
      admin_get_affinity_ecosystem: {
        Args: { p_club: string; p_limit?: number }
        Returns: Json
      }
      admin_get_audit_summary: { Args: never; Returns: Json }
      admin_get_bi_stats: { Args: never; Returns: Json }
      admin_get_club_neighborhood_ranking: {
        Args: { p_club_name: string; p_limit?: number; p_state?: string }
        Returns: Json
      }
      admin_get_executive_summary: { Args: { p_days?: number }; Returns: Json }
      admin_get_geo_options: {
        Args: {
          p_city?: string
          p_continent?: string
          p_country?: string
          p_state?: string
        }
        Returns: Json
      }
      admin_get_global_bi_stats: {
        Args: {
          p_city?: string
          p_continent?: string
          p_country?: string
          p_neighborhood?: string
          p_state?: string
        }
        Returns: Json
      }
      admin_get_neighborhood_dominance: {
        Args: { p_limit?: number }
        Returns: Json
      }
      admin_get_partner_revenue_heatmap: {
        Args: { p_days?: number }
        Returns: Json
      }
      admin_get_socioeconomic_profile: {
        Args: { p_club?: string; p_state?: string }
        Returns: Json
      }
      admin_get_sympathy_votes: {
        Args: never
        Returns: {
          cidade: string
          clube_coracao: string
          clube_simpatia: string
          created_at: string
          estado: string
          fingerprint: string
          pais: string
          slot: number
          user_email: string
          user_id: string
          user_nome: string
          voto_id: string
        }[]
      }
      admin_get_vote_sympathies: { Args: { p_voto_id: string }; Returns: Json }
      admin_get_votes_with_tracking: {
        Args: never
        Returns: {
          cep: string
          cidade: string
          clube_nome: string
          created_at: string
          estado: string
          fraud_score: number
          ip_address: string
          is_suspicious: boolean
          motivo_suspicao: string
          status_aprovacao: string
          sympathy_1: string
          sympathy_2: string
          sympathy_3: string
          sympathy_4: string
          user_email: string
          user_nome: string
          voto_id: string
        }[]
      }
      admin_purge_suspicious_to_trash: { Args: never; Returns: Json }
      apply_vote_fraud_audit: {
        Args: { p_voto_id: string }
        Returns: undefined
      }
      check_fixture_status: { Args: { p_fixture_json: Json }; Returns: boolean }
      clean_dead_competitions: { Args: never; Returns: undefined }
      clean_fictitious_data: { Args: never; Returns: undefined }
      fake_votes_summary: { Args: never; Returns: Json }
      get_active_competitions_v2: {
        Args: { p_team_id: number }
        Returns: {
          l_id: number
          l_name: string
          l_type: string
        }[]
      }
      get_cached_rivals: {
        Args: { p_clube_nome: string }
        Returns: {
          r_emblema: string
          r_nome: string
        }[]
      }
      get_club_vote_ranking: { Args: { p_limit?: number }; Returns: Json }
      get_club_vote_summary: { Args: { p_club_name: string }; Returns: Json }
      get_distinct_regions: {
        Args: { p_level: string; p_parent?: string }
        Returns: Json
      }
      get_heatmap_data: {
        Args: { p_club_name: string; p_filter_value?: string; p_level?: string }
        Returns: Json
      }
      get_heatmap_neighborhoods: {
        Args: { p_city: string; p_club_name: string }
        Returns: Json
      }
      get_heatmap_stats: {
        Args: { p_clube_nome: string }
        Returns: {
          is_precise: boolean
          lat: number
          lng: number
          location_name: string
          vote_count: number
        }[]
      }
      get_inviter_info: {
        Args: { _ref: string }
        Returns: {
          nome_exibicao: string
        }[]
      }
      get_my_ambassador_referrals: {
        Args: never
        Returns: {
          bairro: string
          cidade: string
          clube_nome: string
          estado: string
          indicacao_created_at: string
          indicacao_id: string
          indicado_id: string
          nome: string
          voto_created_at: string
          voto_id: string
        }[]
      }
      get_ranking_with_growth: {
        Args: { p_level: string; p_limit?: number; p_value?: string }
        Returns: Json
      }
      get_real_time_competitions: {
        Args: { p_team_id: number }
        Returns: {
          is_active: boolean
          league_id: number
          league_name: string
        }[]
      }
      get_rivals_fast: {
        Args: { p_club_name: string }
        Returns: {
          r_escudo: string
          r_nome: string
        }[]
      }
      get_rivals_instant: {
        Args: { p_club_name: string }
        Returns: {
          escudo_url: string
          nome: string
        }[]
      }
      get_sympathy_ranking: { Args: { p_limit?: number }; Returns: Json }
      get_team_standings_real: { Args: { p_team_name: string }; Returns: Json }
      get_team_stats_v2: {
        Args: {
          location_name: string
          location_type: string
          team_id_param: string
        }
        Returns: {
          total_votos: number
        }[]
      }
      get_top_clubs_by_region: {
        Args: { p_level: string; p_limit?: number; p_value: string }
        Returns: Json
      }
      get_votes_count_by_clubs: {
        Args: { p_club_names: string[] }
        Returns: {
          clube_nome: string
          votes: number
        }[]
      }
      get_votos_por_territorio:
        | {
            Args: { nome_local: string; time_id: string; tipo_local: string }
            Returns: {
              quantidade: number
            }[]
          }
        | {
            Args: { nome_local: string; time_nome: string; tipo_local: string }
            Returns: {
              quantidade: number
            }[]
          }
      is_admin_or_master: { Args: { _user_id: string }; Returns: boolean }
      master_reset_my_vote: { Args: never; Returns: Json }
      purge_fake_votes: { Args: never; Returns: Json }
      purge_invalid_fake_votes: { Args: never; Returns: Json }
      purge_mock_data: { Args: never; Returns: undefined }
      register_referral_from_code: {
        Args: { p_codigo: string; p_indicado_id?: string }
        Returns: boolean
      }
      search_club_city_votes: {
        Args: { p_city_query: string; p_club_name: string; p_limit?: number }
        Returns: Json
      }
      seed_fake_votes: {
        Args: {
          p_city?: string
          p_country?: string
          p_quantidade?: number
          p_state?: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
