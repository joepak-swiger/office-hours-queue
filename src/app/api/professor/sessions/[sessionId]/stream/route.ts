import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const encoder = new TextEncoder();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });
  const professorId = user.id;

  let open = true;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    open = false;
    if (timer) clearTimeout(timer);
  };

  request.signal.addEventListener('abort', stop);

  const stream = new ReadableStream({
    async start(controller) {
      async function send() {
        if (!open) return;

        try {
          const { count } = await supabase
            .from('queue_entries')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('professor_id', professorId)
            .in('status', ['waiting', 'next', 'ready', 'checked_in', 'late', 'in_session']);

          if (!open) return;

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ activeCount: count ?? 0 })}\n\n`));
          timer = setTimeout(send, 8000);
        } catch (error) {
          if (open) {
            console.warn('[professor-session-stream-closed]', error);
            stop();
          }
        }
      }

      void send();
    },
    cancel() {
      stop();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
