import { z } from 'zod';

export const studentLoginSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission Number is required'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of Birth must be in YYYY-MM-DD format'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const csvRowSchema = z.object({
  admission_number: z.string().min(1),
  roll_number: z.string().optional(),
  gr_number: z.string().optional(),
  student_name: z.string().min(1),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  class: z.string().min(1),
  division: z.string().optional(),
  academic_session: z.string().min(1),
  // Additional fields for subjects will be handled dynamically
}).catchall(z.any());
