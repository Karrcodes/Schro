export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ static: true }); }
export async function POST() { return NextResponse.json({ static: true }); }
export async function PATCH() { return NextResponse.json({ static: true }); }
export async function DELETE() { return NextResponse.json({ static: true }); }
