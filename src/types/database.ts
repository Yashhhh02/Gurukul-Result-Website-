export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          admission_number: string
          roll_number: string | null
          gr_number: string | null
          student_name: string
          dob: string
          gender: 'Male' | 'Female' | 'Other' | null
          father_name: string | null
          mother_name: string | null
          class: string
          division: string | null
          academic_session: string
          photo_url: string | null
          status: 'active' | 'inactive' | 'transferred'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['students']['Insert']>
      }
      subjects: {
        Row: {
          id: string
          subject_name: string
          subject_code: string
          max_theory: number
          max_practical: number
          max_internal: number
          passing_marks: number
          display_order: number
          class_group: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>
      }
      student_results: {
        Row: {
          id: string
          student_id: string
          subject_id: string
          theory_marks: number | null
          practical_marks: number | null
          internal_marks: number | null
          total_marks: number | null
          grade: string | null
          is_absent: boolean
          remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['student_results']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_marks'>
        Update: Partial<Database['public']['Tables']['student_results']['Insert']>
      }
      result_summary: {
        Row: {
          id: string
          result_id: string
          student_id: string
          total_marks: number
          max_marks: number
          percentage: number
          overall_grade: string | null
          result_status: 'pass' | 'fail' | 'compartment' | 'absent'
          attendance: number | null
          teacher_remarks: string | null
          is_published: boolean
          issue_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['result_summary']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['result_summary']['Insert']>
      }
      school_settings: {
        Row: {
          id: string
          school_name: string
          school_code: string | null
          affiliation_number: string | null
          board_name: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          pincode: string | null
          contact_phone: string | null
          contact_email: string | null
          logo_url: string | null
          website: string | null
          result_issue_place: string | null
          result_issue_date: string | null
          current_session: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['school_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['school_settings']['Insert']>
      }
      school_signatures: {
        Row: {
          id: string
          signature_type: 'principal' | 'exam_incharge' | 'class_teacher' | 'school_seal'
          label: string
          image_url: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['school_signatures']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['school_signatures']['Insert']>
      }
    }
  }
}
