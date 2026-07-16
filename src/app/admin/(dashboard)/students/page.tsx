import { createClient } from '@/lib/supabase/server';
import StudentsClient from '@/components/admin/StudentsClient';

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  // Fetch all students (limit to 500 for demo performance, ideally paginate)
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .order('class', { ascending: true })
    .order('student_name', { ascending: true })
    .limit(500);

  if (error) {
    console.error("Error fetching students:", error);
  }

  return (
    <div className="animate-in fade-in duration-500">
      <StudentsClient initialStudents={students || []} />
    </div>
  );
}
