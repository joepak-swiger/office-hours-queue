import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { visitsToCsv, type VisitLike } from '@/lib/office-hours/analytics';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const [{ data: appointments }, { data: queueEntries }] = await Promise.all([
    supabase.from('appointments').select('id,status,created_at,wait_minutes,duration_minutes,courses(code),topic_categories(label)').eq('professor_id', user.id),
    supabase.from('queue_entries').select('id,status,created_at,wait_minutes,duration_minutes,courses(code),topic_categories(label)').eq('professor_id', user.id)
  ]);
  const visits: VisitLike[] = [
    ...(appointments ?? []).map((item: any) => ({ id: item.id, mode: 'scheduled' as const, status: item.status, courseCode: item.courses?.code ?? 'Course', topicCategory: item.topic_categories?.label ?? 'Other', createdAt: item.created_at, waitMinutes: item.wait_minutes, durationMinutes: item.duration_minutes })),
    ...(queueEntries ?? []).map((item: any) => ({ id: item.id, mode: 'walk_in' as const, status: item.status, courseCode: item.courses?.code ?? 'Course', topicCategory: item.topic_categories?.label ?? 'Other', createdAt: item.created_at, waitMinutes: item.wait_minutes, durationMinutes: item.duration_minutes }))
  ];

  return new NextResponse(visitsToCsv(visits), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="office-hours-analytics.csv"'
    }
  });
}
