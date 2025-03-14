import { NextResponse } from 'next/server';
import { InverterProviderFactory } from '@/lib/inverters/factory';
import { SupportedManufacturers } from '@/lib/inverters/types';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');
    const manufacturer = (await cookies()).get('inverter_manufacturer')?.value;
    const token = (await cookies()).get('inverter_token')?.value;

    if (!plantId || !manufacturer || !token) {
      return NextResponse.json(
        { error: 'Parâmetros incompletos' },
        { status: 400 }
      );
    }

    const provider = InverterProviderFactory.getProvider(manufacturer as SupportedManufacturers);
    await provider.login({ username: '', password: token });

    const devices = await provider.getDeviceListByPlant(plantId);

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Erro ao buscar dispositivos:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar dispositivos' },
      { status: 500 }
    );
  }
}