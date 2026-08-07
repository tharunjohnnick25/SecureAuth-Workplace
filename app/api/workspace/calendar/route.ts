import { NextRequest, NextResponse } from 'next/server';
import { MockWorkspace } from '@/lib/mock-workspace';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get('owner');
  
  if (!owner) {
    return NextResponse.json({ error: 'Owner is required' }, { status: 400 });
  }

  const events = MockWorkspace.getEventsByOwner(owner);
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.title || !data.date || !data.owner) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newEvent = MockWorkspace.addEvent({
      title: data.title,
      description: data.description,
      date: data.date,
      owner: data.owner,
      color: data.color,
    });

    return NextResponse.json({ event: newEvent }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const success = MockWorkspace.deleteEvent(id);
    if (!success) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
