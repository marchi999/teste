import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getSession } from '@/lib/auth/session';
import { eq, inArray } from 'drizzle-orm';
import { integracao, teamMembers } from '@/lib/db/schema';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { manufacturer, credentials, plants } = await req.json();

    console.log('Credenciais recebidas:', credentials);

    if (!credentials.username || !credentials.password) {
      return NextResponse.json(
        { error: 'Credenciais incompletas. Forneça login e senha.' },
        { status: 400 }
      );
    }

    // Criptografar credenciais antes de salvar (TODO: substituir por criptografia real)
    const encryptedCredentials = Buffer.from(JSON.stringify(credentials)).toString('base64');

    // Buscar o time do usuário uma única vez
    const userTeam = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, session.user.id)
    });

    if (!userTeam) {
      return NextResponse.json({ error: 'Usuário não pertence a nenhum time' }, { status: 400 });
    }

    // Criar um array de todos os serialNumbers para verificar se já existem no banco
    const serialNumbers = plants.flatMap((plant: { devices: { sn: string }[] }) => plant.devices.map((device) => device.sn));

    // Buscar inversores que já existem no banco para evitar inserções duplicadas
    const existingInverters = await db.query.integracao.findMany({
      where: inArray(integracao.serialNumber, serialNumbers),
      columns: { serialNumber: true }
    });

    // Criar um set para verificar rapidamente quais inversores já existem
    const existingSerials = new Set(existingInverters.map((inv) => inv.serialNumber));

    // Criar um array de promessas para inserções
    const insertPromises = [];

    for (const plant of plants) {
      for (const device of plant.devices) {
        if (!existingSerials.has(device.sn)) {
          const { username, password } = credentials;
          const loginInversor = username;
          const senhaInversor = password;
          // Adicionar a inserção à lista de promessas
          insertPromises.push(
            db.insert(integracao).values({
              serialNumber: device.sn,
              model: device.model,
              manufacturer,
              plantId: plant.plantId,
              credentials: encryptedCredentials,
              userId: session.user.id,
              teamId: userTeam.teamId,
              loginInversor,
              senhaInversor,
              createdAt: new Date(),
            })
          );
        }
      }
    }

    // Executar todas as inserções de uma vez
    await Promise.all(insertPromises);

    return NextResponse.json({ message: 'Integração realizada com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar integração:', error);
    return NextResponse.json({ error: 'Falha ao salvar integração' }, { status: 500 });
  }
}
