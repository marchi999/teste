import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getSession } from '@/lib/auth/session';
import { eq, inArray } from 'drizzle-orm';
import { integracao } from '@/lib/db/schema';

export async function GET(req: Request) {
  try {
    // Obtém a sessão do usuário
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.log('Integrations:');
    // Consulta as integrações realizadas pelo usuário
    const integrations = await db.query.integracao.findMany({
      where: eq(integracao.userId, session.user.id),
    });

    // Verifica se o usuário não tem integrações
    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ integratedPlants: [] });
    }
 
    console.log('Integrations:');
    // Extrai os serial numbers dos inversores integrados
    const inverterSns = integrations.map((integracao) => integracao.serialNumber);
   
    // Consulta os inversores com serial number correspondente
    const integratedInverters = await db.query.integracao.findMany({
      where: inArray(integracao.serialNumber, inverterSns),
    });

    // Cria um mapa de plantas integradas
    const plantsMap: Record<
      string,
      { id: string; plantName: string; plantAddress: string; devices: any[] }
    > = {};

    integratedInverters.forEach((inverter) => {
      // Se a planta ainda não foi adicionada ao mapa, cria a entrada
      if (!plantsMap[inverter.plantId]) {
        plantsMap[inverter.plantId] = {
          id: inverter.plantId,
          plantName: `Planta ${inverter.plantId}`,
          plantAddress: `Endereço ${inverter.plantId}`,
          devices: [],
        };
      }

      // Adiciona o inversor à lista de dispositivos da planta
      plantsMap[inverter.plantId].devices.push({
        sn: inverter.serialNumber,
        model: inverter.model,
        manufacturer: inverter.manufacturer,
        lastSyncAt: inverter.lastSyncAt,
        status: inverter.status, 
        credentials: inverter.credentials,
        loginInversor: inverter.loginInversor,  
        senhaInversor: inverter.senhaInversor,
      });
    });

    // Converte o mapa de plantas em uma lista
    const integratedPlants = Object.values(plantsMap);

    // Retorna a resposta com as plantas integradas
    return NextResponse.json({ integratedPlants });
  } catch (error: any) {
    // Log do erro para depuração
    console.error('Erro ao carregar plantas integradas:', error);
    return NextResponse.json(
      { error: 'Falha ao carregar plantas integradas' },
      { status: 500 }
    );
  }
}
