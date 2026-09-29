import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const encoder = new TextEncoder();
  const supabase = createSupabaseServiceClient();

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      async function send() {
        if (!open) return;
        const [queueResult, appointmentResult] = await Promise.all([
          supabase.from('queue_entries').select('status, position, updated_at').eq('status_token', token).maybeSingle(),
          supabase.from('appointments').select('status, updated_at').eq('status_token', token).maybeSingle()
        ]);
        const record = queueResult.data ?? appointmentResult.data;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(record ?? { status: 'not_found' })}\n\n`));
        setTimeout(send, 8000);
      }
      await send();
      return () => { open = false; };
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
