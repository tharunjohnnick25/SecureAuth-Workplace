export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: string;
          role_id: string | null;
          org_id: string | null;
          employee_id: string | null;
          department: string | null;
          status: string;
          is_mfa_enabled: boolean;
          mfa_secret: string | null;
          mfa_recovery_codes: Json | null;
          biometric_enabled: boolean;
          push_token: string | null;
          risk_based_auth: boolean;
          security_alerts: boolean;
          new_device_alerts: boolean;
          risk_score: number;
          failed_login_attempts: number;
          lockout_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          role?: string;
          status?: string;
          department?: string | null;
          designation?: string | null;
          employment_type?: string | null;
          phone?: string | null;
          company_id?: string | null;
          org_id?: string | null;
          employee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: string;
          employee_id?: string | null;
          department?: string | null;
          designation?: string | null;
          employment_type?: string | null;
          company_id?: string | null;
          status?: string;
          is_mfa_enabled?: boolean;
          biometric_enabled?: boolean;
          risk_based_auth?: boolean;
          security_alerts?: boolean;
          new_device_alerts?: boolean;
          risk_score?: number;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          domain: string;
          created_at: string;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          head: string | null;
          employee_count: number;
          avg_risk_score: number;
          created_at: string;
        };
      };
      employee_requests: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          status: 'pending' | 'approved' | 'rejected';
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          status?: 'pending' | 'approved' | 'rejected';
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          status?: 'pending' | 'approved' | 'rejected';
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          amount: number;
          currency: string;
          status: 'SUCCESS' | 'FAILED' | 'PENDING';
          created_at: string;
        };
      };
      attendance_logs: {
        Row: {
          id: string;
          user_id: string;
          check_in: string;
          check_out: string | null;
          status: string;
          location: Json | null;
          ip_address: string;
          created_at: string;
        };
      };
      login_logs: {
        Row: {
          id: string;
          user_id: string;
          ip_address: string;
          user_agent: string;
          browser: string;
          os: string;
          city: string;
          country: string;
          location: Json | null;
          status: string;
          risk_level: string;
          risk_score: number;
          created_at: string;
        };
      };
      login_history: {
        Row: {
          id: string;
          user_id: string;
          device_id: string | null;
          ip_address: string;
          browser: string;
          os: string;
          status: string;
          failure_reason: string | null;
          risk_score: number;
          risk_level: string;
          city: string;
          country: string;
          created_at: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource: string;
          details: Json | null;
          old_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          action: string;
          resource: string;
          details?: Json | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          resource?: string;
          details?: Json | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          session_token: string;
          expires_at: string;
          last_active: string;
          is_active: boolean;
          ip_address: string;
          user_agent: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          device_id?: string;
          session_token: string;
          expires_at: string;
          last_active?: string;
          is_active?: boolean;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_id?: string;
          session_token?: string;
          expires_at?: string;
          last_active?: string;
          is_active?: boolean;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
        };
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          device_name: string;
          device_type: string;
          os: string;
          browser: string;
          is_trusted: boolean;
          push_token: string | null;
          risk_score: number;
          location: string;
          last_active: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          device_id?: string;
          device_name?: string;
          device_type?: string;
          os?: string;
          browser?: string;
          is_trusted?: boolean;
          last_active?: string;
        };
        Update: {
          id?: string;
          device_name?: string;
          device_type?: string;
          os?: string;
          browser?: string;
          is_trusted?: boolean;
          last_active?: string;
        };
      };
      mfa_settings: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          secret: string | null;
          backup_codes: Json | null;
          is_verified: boolean;
          last_used: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          secret?: string | null;
          backup_codes?: Json | null;
          is_verified?: boolean;
          last_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          secret?: string | null;
          backup_codes?: Json | null;
          is_verified?: boolean;
          last_used?: string | null;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          is_read?: boolean;
        };
      };
      threat_logs: {
        Row: {
          id: string;
          type: string;
          severity: string;
          description: string;
          source_ip: string | null;
          user_id: string | null;
          is_read: boolean;
          created_at: string;
        };
      };
      security_events: {
        Row: {
          id: string;
          event_type: string;
          details: Json | null;
          severity: string;
          user_id: string | null;
          created_at: string;
        };
      };
      ai_risk_scores: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          risk_level: string;
          factors: Json | null;
          ip_address: string | null;
          device_id: string | null;
          location: Json | null;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          risk_level: string;
          factors?: Json | null;
          ip_address?: string | null;
          device_id?: string | null;
          location?: Json | null;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          score?: number;
          risk_level?: string;
          factors?: Json | null;
          ip_address?: string | null;
          device_id?: string | null;
          location?: Json | null;
          calculated_at?: string;
        };
      };
      threat_predictions: {
        Row: {
          id: string;
          user_id: string;
          compromise_probability: number;
          vulnerability_class: string;
          contributing_factors: Json | null;
          recommendations: Json | null;
          predicted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          compromise_probability: number;
          vulnerability_class: string;
          contributing_factors?: Json | null;
          recommendations?: Json | null;
          predicted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          compromise_probability?: number;
          vulnerability_class?: string;
          contributing_factors?: Json | null;
          recommendations?: Json | null;
          predicted_at?: string;
        };
      };
      anomaly_logs: {
        Row: {
          id: string;
          user_id: string | null;
          type: string;
          severity: string;
          details: Json | null;
          is_resolved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type: string;
          severity: string;
          details?: Json | null;
          is_resolved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          type?: string;
          severity?: string;
          details?: Json | null;
          is_resolved?: boolean;
          created_at?: string;
        };
      };
      behavioral_profiles: {
        Row: {
          id: string;
          user_id: string;
          typing_baseline: Json | null;
          mouse_baseline: Json | null;
          login_patterns: Json | null;
          trust_score: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          typing_baseline?: Json | null;
          mouse_baseline?: Json | null;
          login_patterns?: Json | null;
          trust_score?: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          typing_baseline?: Json | null;
          mouse_baseline?: Json | null;
          login_patterns?: Json | null;
          trust_score?: number;
          last_updated?: string;
        };
      };
      ml_predictions: {
        Row: {
          id: string;
          user_id: string;
          model_name: string;
          inputs: Json | null;
          outputs: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          model_name: string;
          inputs?: Json | null;
          outputs?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          model_name?: string;
          inputs?: Json | null;
          outputs?: Json | null;
          created_at?: string;
        };
      };
      access_requests: {
        Row: {
          id: string;
          user_id: string;
          resource: string;
          status: 'PENDING' | 'APPROVED' | 'REJECTED';
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          requester_id?: string;
          company_id?: string;
          module?: string;
          resource?: string;
          status?: string;
          reason?: string | null;
          duration_hours?: number | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          reason?: string | null;
          approved_by?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          data: Json;
          created_at: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          action: string;
          description: string | null;
          created_at: string;
        };
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
      };
      geo_locations: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          ip_address: string;
          city: string;
          country: string;
          latitude: number;
          longitude: number;
          is_suspicious: boolean;
          created_at: string;
        };
      };
      risk_scores: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          score: number;
          risk_level: string;
          factors: Json | null;
          evaluated_at: string;
        };
      };
      support_queries: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          message: string;
          status: string;
          created_at: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          host_id: string;
          company_id: string | null;
          title: string;
          status: string;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
      };
      meeting_participants: {
        Row: {
          meeting_id: string;
          user_id: string;
          role: string;
          status: string;
          joined_at: string | null;
          left_at: string | null;
        };
      };
      internal_emails: {
        Row: {
          id: string;
          owner_id: string;
          company_id: string | null;
          sender_id: string;
          recipient_id: string | null;
          subject: string;
          body: string;
          folder: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          company_id?: string | null;
          sender_id: string;
          recipient_id?: string | null;
          subject: string;
          body: string;
          folder?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          company_id?: string | null;
          sender_id?: string;
          recipient_id?: string | null;
          subject?: string;
          body?: string;
          folder?: string;
          is_read?: boolean;
        };
      };
      resource_requests: {
        Row: {
          id: string;
          user_id: string;
          resource_id: string;
          status: string;
          processed_by: string | null;
          updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resource_id: string;
          status?: string;
          processed_by?: string | null;
          updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          processed_by?: string | null;
          updated_at?: string | null;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          start_time: string;
          end_time: string;
          description: string | null;
          created_at: string;
        };
      };
      passkeys: {
        Row: {
          id: string;
          user_id: string;
          credential_id: string;
          public_key: string;
          counter: number;
          device_type: string | null;
          backed_up: boolean | null;
          transports: string[] | null;
          last_used_at: string | null;
          created_at: string;
        };
        Update: {
          counter?: number;
          last_used_at?: string | null;
        };
      };
      webauthn_challenges: {
        Row: {
          id: string;
          user_id: string | null;
          challenge: string;
          type: string;
          expires_at: string;
          created_at: string;
        };
      };
    };
  };
}
