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
      abandoned_carts: {
        Row: {
          created_at: string
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          payment_method: string | null
          product_id: string
          recovered: boolean
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          payment_method?: string | null
          product_id: string
          recovered?: boolean
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          payment_method?: string | null
          product_id?: string
          recovered?: boolean
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      appsell_integrations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_accounts: {
        Row: {
          auto_recharge_amount: number
          auto_recharge_enabled: boolean
          auto_recharge_threshold: number
          balance: number
          blocked: boolean
          card_brand: string | null
          card_last4: string | null
          card_token: string | null
          created_at: string
          credit_limit: number
          credit_tier: string
          id: string
          last_auto_recharge_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_recharge_amount?: number
          auto_recharge_enabled?: boolean
          auto_recharge_threshold?: number
          balance?: number
          blocked?: boolean
          card_brand?: string | null
          card_last4?: string | null
          card_token?: string | null
          created_at?: string
          credit_limit?: number
          credit_tier?: string
          id?: string
          last_auto_recharge_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_recharge_amount?: number
          auto_recharge_enabled?: boolean
          auto_recharge_threshold?: number
          balance?: number
          blocked?: boolean
          card_brand?: string | null
          card_last4?: string | null
          card_token?: string | null
          created_at?: string
          credit_limit?: number
          credit_tier?: string
          id?: string
          last_auto_recharge_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_recharges: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          external_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          external_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          external_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_tiers: {
        Row: {
          color: string
          credit_limit: number
          id: string
          key: string
          label: string
          level: number
          updated_at: string
        }
        Insert: {
          color?: string
          credit_limit?: number
          id?: string
          key: string
          label: string
          level?: number
          updated_at?: string
        }
        Update: {
          color?: string
          credit_limit?: number
          id?: string
          key?: string
          label?: string
          level?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      checkout_builder_configs: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          layout: Json
          name: string
          price: number | null
          product_id: string
          settings: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout?: Json
          name?: string
          price?: number | null
          product_id: string
          settings?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout?: Json
          name?: string
          price?: number | null
          product_id?: string
          settings?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_builder_configs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_settings: {
        Row: {
          company_name: string | null
          countdown_minutes: number | null
          custom_css: string | null
          id: string
          logo_url: string | null
          pix_discount_percent: number | null
          primary_color: string | null
          show_countdown: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          countdown_minutes?: number | null
          custom_css?: string | null
          id?: string
          logo_url?: string | null
          pix_discount_percent?: number | null
          primary_color?: string | null
          show_countdown?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          countdown_minutes?: number | null
          custom_css?: string | null
          id?: string
          logo_url?: string | null
          pix_discount_percent?: number | null
          primary_color?: string | null
          show_countdown?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      checkout_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          layout: Json
          name: string
          published: boolean
          settings: Json
          thumbnail_url: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          layout?: Json
          name: string
          published?: boolean
          settings?: Json
          thumbnail_url?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          layout?: Json
          name?: string
          published?: boolean
          settings?: Json
          thumbnail_url?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_amount: number | null
          product_id: string | null
          used_count: number
          user_id: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_amount?: number | null
          product_id?: string | null
          used_count?: number
          user_id?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_amount?: number | null
          product_id?: string | null
          used_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          file_url: string | null
          id: string
          module_id: string
          sort_order: number
          title: string
        }
        Insert: {
          content?: string | null
          content_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          module_id: string
          sort_order?: number
          title: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          module_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          product_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          product_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          product_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          cloudflare_hostname_id: string | null
          created_at: string
          hostname: string
          id: string
          ssl_status: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cloudflare_hostname_id?: string | null
          created_at?: string
          hostname: string
          id?: string
          ssl_status?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cloudflare_hostname_id?: string | null
          created_at?: string
          hostname?: string
          id?: string
          ssl_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          bounce_reason: string | null
          bounced_at: string | null
          clicked_at: string | null
          cost_estimate: number | null
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          email_type: string
          html_body: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          order_id: string | null
          product_id: string | null
          resend_id: string | null
          source: string | null
          status: string
          subject: string
          to_email: string
          to_name: string | null
          user_id: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounced_at?: string | null
          clicked_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          email_type?: string
          html_body?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          order_id?: string | null
          product_id?: string | null
          resend_id?: string | null
          source?: string | null
          status?: string
          subject: string
          to_email: string
          to_name?: string | null
          user_id?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounced_at?: string | null
          clicked_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          email_type?: string
          html_body?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          order_id?: string | null
          product_id?: string | null
          resend_id?: string | null
          source?: string | null
          status?: string
          subject?: string
          to_email?: string
          to_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      emq_snapshots: {
        Row: {
          browser_count: number | null
          created_at: string
          dedup_rate: number | null
          dual_count: number | null
          emq_score: number | null
          event_name: string
          id: string
          pixel_id: string
          product_id: string
          server_count: number | null
          snapshot_date: string
          vid_coverage: number | null
        }
        Insert: {
          browser_count?: number | null
          created_at?: string
          dedup_rate?: number | null
          dual_count?: number | null
          emq_score?: number | null
          event_name: string
          id?: string
          pixel_id: string
          product_id: string
          server_count?: number | null
          snapshot_date?: string
          vid_coverage?: number | null
        }
        Update: {
          browser_count?: number | null
          created_at?: string
          dedup_rate?: number | null
          dual_count?: number | null
          emq_score?: number | null
          event_name?: string
          id?: string
          pixel_id?: string
          product_id?: string
          server_count?: number | null
          snapshot_date?: string
          vid_coverage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "emq_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      fraud_blacklist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          type: string
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          type: string
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      internal_tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_materials: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          lesson_id: string
          material_type: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          lesson_id: string
          material_type?: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          lesson_id?: string
          material_type?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          lesson_id: string
          member_access_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id: string
          member_access_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id?: string
          member_access_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_member_access_id_fkey"
            columns: ["member_access_id"]
            isOneToOne: false
            referencedRelation: "member_access"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_reviews: {
        Row: {
          approved: boolean
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          lesson_id: string
          member_access_id: string
          rating: number
        }
        Insert: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          lesson_id: string
          member_access_id: string
          rating?: number
        }
        Update: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          lesson_id?: string
          member_access_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reviews_member_access_id_fkey"
            columns: ["member_access_id"]
            isOneToOne: false
            referencedRelation: "member_access"
            referencedColumns: ["id"]
          },
        ]
      }
      member_access: {
        Row: {
          access_token: string
          course_id: string
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          order_id: string | null
        }
        Insert: {
          access_token?: string
          course_id: string
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
        }
        Update: {
          access_token?: string
          course_id?: string
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          notification_pattern: string
          notification_sound: string
          report_08: boolean
          report_12: boolean
          report_18: boolean
          report_23: boolean
          send_approved: boolean
          send_pending: boolean
          show_dashboard_name: boolean
          show_product_name: boolean
          show_utm_campaign: boolean
          show_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_pattern?: string
          notification_sound?: string
          report_08?: boolean
          report_12?: boolean
          report_18?: boolean
          report_23?: boolean
          send_approved?: boolean
          send_pending?: boolean
          show_dashboard_name?: boolean
          show_product_name?: boolean
          show_utm_campaign?: boolean
          show_value?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_pattern?: string
          notification_sound?: string
          report_08?: boolean
          report_12?: boolean
          report_18?: boolean
          report_23?: boolean
          send_approved?: boolean
          send_pending?: boolean
          show_dashboard_name?: boolean
          show_product_name?: boolean
          show_utm_campaign?: boolean
          show_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_bumps: {
        Row: {
          active: boolean
          bump_product_id: string
          call_to_action: string
          created_at: string
          description: string
          id: string
          product_id: string
          sort_order: number
          title: string
          use_product_image: boolean
          user_id: string | null
        }
        Insert: {
          active?: boolean
          bump_product_id: string
          call_to_action?: string
          created_at?: string
          description?: string
          id?: string
          product_id: string
          sort_order?: number
          title?: string
          use_product_image?: boolean
          user_id?: string | null
        }
        Update: {
          active?: boolean
          bump_product_id?: string
          call_to_action?: string
          created_at?: string
          description?: string
          id?: string
          product_id?: string
          sort_order?: number
          title?: string
          use_product_image?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_bump_product_id_fkey"
            columns: ["bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          payment_method: string
          platform_fee_amount: number | null
          platform_fee_percent: number | null
          product_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          platform_fee_amount?: number | null
          platform_fee_percent?: number | null
          product_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          platform_fee_amount?: number | null
          platform_fee_percent?: number | null
          product_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          environment: string
          id: string
          name: string
          payment_methods: Json
          provider: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          environment?: string
          id?: string
          name?: string
          payment_methods?: Json
          provider: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          environment?: string
          id?: string
          name?: string
          payment_methods?: Json
          provider?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pending_sends: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          message: string
          sent_at: string | null
          status: string
          tenant_id: string
          to_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          message: string
          sent_at?: string | null
          status?: string
          tenant_id: string
          to_number: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          message?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          to_number?: string
        }
        Relationships: []
      }
      pixel_events: {
        Row: {
          created_at: string
          customer_name: string | null
          event_id: string | null
          event_name: string
          id: string
          product_id: string
          source: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          event_id?: string | null
          event_name: string
          id?: string
          product_id: string
          source?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          event_id?: string | null
          event_name?: string
          id?: string
          product_id?: string
          source?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          platform_fee_percent: number | null
          platform_name: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          platform_fee_percent?: number | null
          platform_name?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          platform_fee_percent?: number | null
          platform_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      producer_verifications: {
        Row: {
          address_proof_url: string | null
          created_at: string
          document_back_url: string | null
          document_front_url: string | null
          document_type: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_proof_url?: string | null
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_type?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_proof_url?: string | null
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_type?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_pixels: {
        Row: {
          capi_token: string | null
          created_at: string
          domain: string | null
          fire_on_boleto: boolean
          fire_on_pix: boolean
          id: string
          pixel_id: string
          platform: string
          product_id: string
          user_id: string | null
        }
        Insert: {
          capi_token?: string | null
          created_at?: string
          domain?: string | null
          fire_on_boleto?: boolean
          fire_on_pix?: boolean
          id?: string
          pixel_id: string
          platform?: string
          product_id: string
          user_id?: string | null
        }
        Update: {
          capi_token?: string | null
          created_at?: string
          domain?: string | null
          fire_on_boleto?: boolean
          fire_on_pix?: boolean
          id?: string
          pixel_id?: string
          platform?: string
          product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pixels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          billing_cycle: string
          created_at: string
          delivery_method: string
          description: string | null
          id: string
          image_url: string | null
          is_subscription: boolean
          moderation_status: string
          name: string
          original_price: number | null
          payment_settings: Json
          price: number
          rejection_reason: string | null
          show_coupon: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          delivery_method?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_subscription?: boolean
          moderation_status?: string
          name: string
          original_price?: number | null
          payment_settings?: Json
          price?: number
          rejection_reason?: string | null
          show_coupon?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          delivery_method?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_subscription?: boolean
          moderation_status?: string
          name?: string
          original_price?: number | null
          payment_settings?: Json
          price?: number
          rejection_reason?: string | null
          show_coupon?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          profile_completed: boolean
          updated_at: string
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      pwa_settings: {
        Row: {
          app_name: string
          background_color: string
          description: string | null
          icon_192_url: string | null
          icon_512_url: string | null
          id: string
          notification_body: string | null
          notification_icon_url: string | null
          notification_title: string | null
          short_name: string
          splash_image_url: string | null
          theme_color: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_name?: string
          background_color?: string
          description?: string | null
          icon_192_url?: string | null
          icon_512_url?: string | null
          id?: string
          notification_body?: string | null
          notification_icon_url?: string | null
          notification_title?: string | null
          short_name?: string
          splash_image_url?: string | null
          theme_color?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_name?: string
          background_color?: string
          description?: string | null
          icon_192_url?: string | null
          icon_512_url?: string | null
          id?: string
          notification_body?: string | null
          notification_icon_url?: string | null
          notification_title?: string | null
          short_name?: string
          splash_image_url?: string | null
          theme_color?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          action: string
          blocked: boolean
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action: string
          blocked?: boolean
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          blocked?: boolean
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      sales_pages: {
        Row: {
          created_at: string
          id: string
          layout: Json
          product_id: string
          published: boolean
          settings: Json
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: Json
          product_id: string
          published?: boolean
          settings?: Json
          slug: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          product_id?: string
          published?: boolean
          settings?: Json
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_pages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      upsell_offers: {
        Row: {
          active: boolean
          created_at: string
          description: string
          discount_percent: number
          id: string
          product_id: string
          sort_order: number
          title: string
          upsell_product_id: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id: string
          sort_order?: number
          title?: string
          upsell_product_id: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string
          sort_order?: number
          title?: string
          upsell_product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upsell_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_offers_upsell_product_id_fkey"
            columns: ["upsell_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utmify_integrations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_audit_log: {
        Row: {
          block_reason: string | null
          blocked: boolean
          caller_type: string
          caller_user_id: string | null
          created_at: string
          deliveries_count: number | null
          environment: string
          event_type: string
          id: string
          ip_address: string | null
          order_id: string | null
          order_status_at_fire: string | null
          payload: Json | null
          user_agent: string | null
        }
        Insert: {
          block_reason?: string | null
          blocked?: boolean
          caller_type?: string
          caller_user_id?: string | null
          created_at?: string
          deliveries_count?: number | null
          environment?: string
          event_type: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          order_status_at_fire?: string | null
          payload?: Json | null
          user_agent?: string | null
        }
        Update: {
          block_reason?: string | null
          blocked?: boolean
          caller_type?: string
          caller_user_id?: string | null
          created_at?: string
          deliveries_count?: number | null
          environment?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          order_status_at_fire?: string | null
          payload?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          completed_at: string | null
          created_at: string
          endpoint_id: string
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          last_response_body: string | null
          last_response_status: number | null
          max_attempts: number
          next_retry_at: string | null
          order_id: string | null
          payload: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt?: number
          completed_at?: string | null
          created_at?: string
          endpoint_id: string
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          last_response_body?: string | null
          last_response_status?: number | null
          max_attempts?: number
          next_retry_at?: string | null
          order_id?: string | null
          payload?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          created_at?: string
          endpoint_id?: string
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          last_response_body?: string | null
          last_response_status?: number | null
          max_attempts?: number
          next_retry_at?: string | null
          order_id?: string | null
          payload?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          events: string[]
          id: string
          product_id: string | null
          secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          product_id?: string | null
          secret?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          product_id?: string | null
          secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          gateway: string
          id: string
          processed_at: string
        }
        Insert: {
          gateway: string
          id: string
          processed_at?: string
        }
        Update: {
          gateway?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      whatsapp_feature_flags: {
        Row: {
          enabled: boolean
          feature: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          feature: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          feature?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_send_log: {
        Row: {
          created_at: string
          customer_phone: string | null
          error_message: string | null
          id: string
          message_body: string
          order_id: string | null
          status: string
          template_category: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_phone?: string | null
          error_message?: string | null
          id?: string
          message_body: string
          order_id?: string | null
          status?: string
          template_category: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_phone?: string | null
          error_message?: string | null
          id?: string
          message_body?: string
          order_id?: string | null
          status?: string
          template_category?: string
          tenant_id?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          connected_at: string | null
          created_at: string
          id: string
          instance_id: string
          node_url: string
          phone_number: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_id: string
          node_url?: string
          phone_number?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          node_url?: string
          phone_number?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          active: boolean
          body: string
          category: string
          created_at: string
          flow_nodes: Json
          id: string
          name: string
          updated_at: string
          user_id: string
          variables: Json
        }
        Insert: {
          active?: boolean
          body: string
          category?: string
          created_at?: string
          flow_nodes?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
          variables?: Json
        }
        Update: {
          active?: boolean
          body?: string
          category?: string
          created_at?: string
          flow_nodes?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          variables?: Json
        }
        Relationships: []
      }
    }
    Views: {
      active_gateways: {
        Row: {
          environment: string | null
          id: string | null
          name: string | null
          payment_methods: Json | null
          provider: string | null
          user_id: string | null
        }
        Insert: {
          environment?: string | null
          id?: string | null
          name?: string | null
          payment_methods?: Json | null
          provider?: string | null
          user_id?: string | null
        }
        Update: {
          environment?: string | null
          id?: string | null
          name?: string | null
          payment_methods?: Json | null
          provider?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_order_bumps: {
        Row: {
          active: boolean | null
          bump_product_id: string | null
          call_to_action: string | null
          description: string | null
          id: string | null
          product_id: string | null
          sort_order: number | null
          title: string | null
          use_product_image: boolean | null
        }
        Insert: {
          active?: boolean | null
          bump_product_id?: string | null
          call_to_action?: string | null
          description?: string | null
          id?: string | null
          product_id?: string | null
          sort_order?: number | null
          title?: string | null
          use_product_image?: boolean | null
        }
        Update: {
          active?: boolean | null
          bump_product_id?: string | null
          call_to_action?: string | null
          description?: string | null
          id?: string | null
          product_id?: string | null
          sort_order?: number | null
          title?: string | null
          use_product_image?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_bump_product_id_fkey"
            columns: ["bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_product_pixels: {
        Row: {
          domain: string | null
          fire_on_boleto: boolean | null
          fire_on_pix: boolean | null
          id: string | null
          pixel_id: string | null
          platform: string | null
          product_id: string | null
        }
        Insert: {
          domain?: string | null
          fire_on_boleto?: boolean | null
          fire_on_pix?: boolean | null
          id?: string | null
          pixel_id?: string | null
          platform?: string | null
          product_id?: string | null
        }
        Update: {
          domain?: string | null
          fire_on_boleto?: boolean | null
          fire_on_pix?: boolean | null
          id?: string | null
          pixel_id?: string | null
          platform?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pixels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_pwa_settings: {
        Row: {
          app_name: string | null
          background_color: string | null
          description: string | null
          icon_192_url: string | null
          icon_512_url: string | null
          id: string | null
          notification_body: string | null
          notification_icon_url: string | null
          notification_title: string | null
          short_name: string | null
          splash_image_url: string | null
          theme_color: string | null
          updated_at: string | null
        }
        Insert: {
          app_name?: string | null
          background_color?: string | null
          description?: string | null
          icon_192_url?: string | null
          icon_512_url?: string | null
          id?: string | null
          notification_body?: string | null
          notification_icon_url?: string | null
          notification_title?: string | null
          short_name?: string | null
          splash_image_url?: string | null
          theme_color?: string | null
          updated_at?: string | null
        }
        Update: {
          app_name?: string | null
          background_color?: string | null
          description?: string | null
          icon_192_url?: string | null
          icon_512_url?: string | null
          id?: string | null
          notification_body?: string | null
          notification_icon_url?: string | null
          notification_title?: string | null
          short_name?: string | null
          splash_image_url?: string | null
          theme_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_billing_credit: {
        Args: { p_amount: number; p_description: string; p_user_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_hits: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: undefined
      }
      get_revenue_summary: {
        Args: { p_user_id: string }
        Returns: {
          paid_count: number
          pending_count: number
          total_fees: number
          total_pending: number
          total_revenue: number
        }[]
      }
      get_webhook_secret: { Args: { p_webhook_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      owns_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      owns_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      owns_module: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      validate_coupon: {
        Args: { p_code: string }
        Returns: {
          code: string
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          max_uses: number
          min_amount: number
          product_id: string
          used_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
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
    Enums: {
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const
