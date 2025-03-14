import { NextResponse } from 'next/server';
import { InverterProviderFactory } from '@/lib/inverters/factory';
import { SupportedManufacturers } from '@/lib/inverters/types';

export async function POST(req: Request) {
  try {
    const { manufacturer, username, password } = await req.json();

    // Verificar se o fabricante é suportado
    if (!InverterProviderFactory.isProviderAvailable(manufacturer as SupportedManufacturers)) {
      return NextResponse.json(
        { error: 'Fabricante ainda não suportado' },
        { status: 400 }
      );
    }

    // Obter o provider apropriado
    const provider = InverterProviderFactory.getProvider(manufacturer as SupportedManufacturers);
    
    // Autenticar
    await provider.login({ username, password });

    // Buscar lista de plantas
    const plants = await provider.getPlantList();

    // Buscar dispositivos para cada planta
    const plantsWithDevices = await Promise.all(
      plants.map(async (plant) => {
        const devices = await provider.getDeviceListByPlant(plant.id);
        return {
          ...plant,
          devices: devices.map(device => ({
            sn: device.sn,
            deviceModel: device.deviceModel,
            status: device.status,
            lastUpdateTime: device.lastUpdateTime,
          })),
        };
      })
    );

    return NextResponse.json({ 
      plants: plantsWithDevices,
      manufacturer,
    });
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json(
      { error: 'Falha na autenticação' },
      { status: 401 }
    );
  }
}
