import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // In a real app, logic to process checkin goes here
    
    return NextResponse.json({ success: true, message: "Check-in received" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Bad Request" }, { status: 400 });
  }
}
