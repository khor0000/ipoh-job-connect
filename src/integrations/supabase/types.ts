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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          message: string
          resume_name: string | null
          resume_path: string
          seeker_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          message: string
          resume_name?: string | null
          resume_path: string
          seeker_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          message?: string
          resume_name?: string | null
          resume_path?: string
          seeker_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_seeker_id_fkey"
            columns: ["seeker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          about: string | null
          address: string | null
          company_name: string
          created_at: string
          phone: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["employer_status"]
          user_id: string
        }
        Insert: {
          about?: string | null
          address?: string | null
          company_name: string
          created_at?: string
          phone?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["employer_status"]
          user_id: string
        }
        Update: {
          about?: string | null
          address?: string | null
          company_name?: string
          created_at?: string
          phone?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["employer_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          area: string
          created_at: string
          description: string
          employer_id: string
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          removed_reason: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: Database["public"]["Enums"]["salary_period"]
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          area?: string
          created_at?: string
          description: string
          employer_id: string
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          removed_reason?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: Database["public"]["Enums"]["salary_period"]
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          description?: string
          employer_id?: string
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          removed_reason?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: Database["public"]["Enums"]["salary_period"]
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          resume_name: string | null
          resume_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          resume_name?: string | null
          resume_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          resume_name?: string | null
          resume_path?: string | null
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_remove_job: {
        Args: { _job_id: string; _reason?: string }
        Returns: undefined
      }
      admin_restore_job: { Args: { _job_id: string }; Returns: undefined }
      can_read_resume: {
        Args: { _path: string; _user_id: string }
        Returns: boolean
      }
      choose_account_type: {
        Args: { _company_name?: string; _phone?: string; _type: string }
        Returns: undefined
      }
      get_open_job: {
        Args: { _job_id: string }
        Returns: {
          area: string
          company_about: string
          company_address: string
          company_name: string
          created_at: string
          description: string
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          salary_max: number
          salary_min: number
          salary_period: Database["public"]["Enums"]["salary_period"]
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_applicant_of: {
        Args: { _employer_id: string; _profile_id: string }
        Returns: boolean
      }
      is_approved_employer: { Args: { _user_id: string }; Returns: boolean }
      is_job_open: { Args: { _job_id: string }; Returns: boolean }
      list_open_jobs: {
        Args: never
        Returns: {
          area: string
          company_name: string
          created_at: string
          description: string
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          salary_max: number
          salary_min: number
          salary_period: Database["public"]["Enums"]["salary_period"]
          title: string
        }[]
      }
      my_applications: {
        Args: never
        Returns: {
          company_name: string
          created_at: string
          id: string
          job_id: string
          job_status: Database["public"]["Enums"]["job_status"]
          job_title: string
          message: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }[]
      }
      owns_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      set_application_status: {
        Args: {
          _application_id: string
          _status: Database["public"]["Enums"]["application_status"]
        }
        Returns: undefined
      }
      set_employer_status: {
        Args: {
          _employer_id: string
          _status: Database["public"]["Enums"]["employer_status"]
        }
        Returns: undefined
      }
      withdraw_application: {
        Args: { _application_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "employer" | "seeker"
      application_status:
        | "submitted"
        | "shortlisted"
        | "rejected"
        | "hired"
        | "withdrawn"
      employer_status: "pending" | "approved" | "rejected"
      job_status: "open" | "closed" | "removed"
      job_type: "full_time" | "part_time" | "contract" | "internship"
      salary_period: "month" | "day" | "hour"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "employer", "seeker"],
      application_status: [
        "submitted",
        "shortlisted",
        "rejected",
        "hired",
        "withdrawn",
      ],
      employer_status: ["pending", "approved", "rejected"],
      job_status: ["open", "closed", "removed"],
      job_type: ["full_time", "part_time", "contract", "internship"],
      salary_period: ["month", "day", "hour"],
    },
  },
} as const
