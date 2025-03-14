import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { integracao } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request) {
  try {
    const { plantId, credentials } = await req.json();
    await db
      .update(integracao)
      .set({
        loginInversor: credentials.username,
        senhaInversor: credentials.password,
        updatedAt: new Date()
      })
      .where(eq(integracao.plantId, plantId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao atualizar credenciais' }, { status: 500 });
  }
}
