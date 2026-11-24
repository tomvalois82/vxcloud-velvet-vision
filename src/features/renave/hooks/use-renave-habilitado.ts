import { useQuery } from '@tanstack/react-query';
import { buscarEtapasRenave, buscarRenaveHabilitado } from '../services/renave-service';

export const CHAVE_RENAVE_HABILITADO = ['renave-habilitado'] as const;

// Lê empresa.renave_habilitado da empresa do usuário logado.
export function useRenaveConfig() {
  return useQuery({ queryKey: CHAVE_RENAVE_HABILITADO, queryFn: buscarRenaveHabilitado, staleTime: 60_000 });
}

export function useRenaveHabilitado(): boolean {
  return useRenaveConfig().data?.habilitado === true;
}

// Etapa RENAVE de um único ciclo (usada nos passos de venda/compra).
export function useEtapaRenave(idEstoque: number | null | undefined) {
  const habilitado = useRenaveHabilitado();
  const consulta = useQuery({
    queryKey: ['renave-etapas', [idEstoque]],
    queryFn: () => buscarEtapasRenave([idEstoque as number]),
    enabled: habilitado && !!idEstoque,
  });
  return { habilitado, etapa: idEstoque ? consulta.data?.get(idEstoque) ?? null : null };
}
