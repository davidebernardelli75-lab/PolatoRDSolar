import { supabase } from './supabase';

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  active: boolean;
  hired_on: string | null;
  created_at: string;
  updated_at: string;
}

export type EmployeeInput = Pick<Employee, 'first_name' | 'last_name' | 'job_title' | 'active' | 'hired_on'>;

export interface EmployeeCourse {
  id: string;
  employee_id: string;
  course_name: string;
  completed_on: string | null;
  expires_on: string | null;
  provider: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type EmployeeCourseUpdate = Partial<Pick<EmployeeCourse,
  'completed_on' | 'expires_on' | 'provider' | 'notes'>>;

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from('employees').select('*')
    .order('last_name', { ascending: true }).order('first_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const { data, error } = await supabase.from('employees').insert(input).select().single();
  if (error) throw error;
  return data as Employee;
}

export async function updateEmployee(id: string, input: Partial<EmployeeInput>): Promise<Employee> {
  const { data, error } = await supabase.from('employees')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as Employee;
}

export async function fetchEmployeeCourses(): Promise<EmployeeCourse[]> {
  const { data, error } = await supabase.from('employee_courses')
    .select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EmployeeCourse[];
}

export async function addEmployeeCourse(employeeId: string, courseName: string): Promise<EmployeeCourse> {
  const { data, error } = await supabase.from('employee_courses')
    .insert({ employee_id: employeeId, course_name: courseName.trim() }).select().single();
  if (error) throw error;
  return data as EmployeeCourse;
}

export async function updateEmployeeCourse(id: string, input: EmployeeCourseUpdate): Promise<EmployeeCourse> {
  const { data, error } = await supabase.from('employee_courses')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as EmployeeCourse;
}

export async function removeEmployeeCourse(id: string): Promise<void> {
  const { error } = await supabase.from('employee_courses').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchCustomCourses(): Promise<string[]> {
  const { data, error } = await supabase.from('training_custom_courses')
    .select('title').order('title', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => row.title as string);
}

export async function createCustomCourse(title: string): Promise<string> {
  const normalized = title.trim();
  if (!normalized || normalized.length > 160) throw new Error('Il nome del corso deve contenere da 1 a 160 caratteri.');
  const { data, error } = await supabase.from('training_custom_courses')
    .insert({ title: normalized }).select('title').single();
  if (error) throw error;
  return data.title as string;
}
