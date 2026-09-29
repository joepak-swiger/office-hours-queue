import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const encoder = new TextEncoder();
  const supabase = createSupabaseServiceClient();

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
          const [queueResult, appointmentResult] = await Promise.all([
            supabase.from('queue_entries').select('status, position, updated_at').eq('status_token', token).maybeSingle(),
            supabase.from('appointments').select('status, updated_at').eq('status_token', token).maybeSingle()
          ]);

          if (!open) return;

          const record = queueResult.data ?? appointmentResult.data;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(record ?? { status: 'not_found' })}\n\n`));
          timer = setTimeout(send, 8000);
        } catch (error) {
          if (open) {
            console.warn('[student-status-stream-closed]', error);
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
