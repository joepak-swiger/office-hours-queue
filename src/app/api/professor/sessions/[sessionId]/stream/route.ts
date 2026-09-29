import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const encoder = new TextEncoder();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });
  const professorId = user.id;

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      async function send() {
        if (!open) return;
        const { count } = await supabase
          .from('queue_entries')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('professor_id', professorId)
          .in('status', ['waiting', 'next', 'ready', 'checked_in', 'late', 'in_session']);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ activeCount: count ?? 0 })}\n\n`));
        setTimeout(send, 8000);
      }
      await send();
      return () => { open = false; };
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}

