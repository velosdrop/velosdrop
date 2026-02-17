//app/api/whatsapp/whatsapp-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'Osmaida12345';
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return new NextResponse('Verification failed', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('WhatsApp Webhook:', JSON.stringify(body, null, 2));
    
    // Handle message status updates
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const statuses = body.entry[0].changes[0].value.statuses;
      
      for (const status of statuses) {
        console.log(`Message ${status.id}: ${status.status}`);
        
        // If message failed, you could trigger SMS fallback here
        if (status.status === 'failed') {
          console.log('WhatsApp delivery failed for message:', status.id);
          // TODO: Trigger SMS fallback
        }
      }
    }
    
    // Handle incoming messages (if users reply)
    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messages = body.entry[0].changes[0].value.messages;
      
      for (const message of messages) {
        console.log(`Incoming from ${message.from}:`, message.text?.body);
        // TODO: Handle customer support messages
      }
    }
    
    return NextResponse.json({ status: 'ok' }, { status: 200 });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}