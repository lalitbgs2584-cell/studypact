import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Check auth header if using cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cron logic goes here
  console.log("Running check-missed cron job at midnight IST");

  return NextResponse.json({ success: true, completedAt: new Date().toISOString() });
}
