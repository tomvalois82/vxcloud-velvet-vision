import { describe, expect, it } from 'bun:test';
import { diasParaVencer } from './certificado';
import { validarArquivoCertificado } from '../certificado-service';

const agora = new Date('2026-11-24T12:00:00Z');

describe('certificado RENAVE', () => {
  it('conta 29 dias para vencer', () => expect(diasParaVencer('2026-12-23T13:00:00Z', agora)).toBe(29));
  it('marca vencido como negativo', () => expect(diasParaVencer('2026-11-20T00:00:00Z', agora)).toBeLessThan(0));
  it('recusa extensão diferente de pfx/p12', () => expect(validarArquivoCertificado(new File(['x'], 'a.pem'))).not.toBeNull());
  it('recusa arquivo acima de 75 KB', () => expect(validarArquivoCertificado(new File([new Uint8Array(76 * 1024)], 'a.pfx'))).not.toBeNull());
  it('aceita .p12 pequeno', () => expect(validarArquivoCertificado(new File(['x'], 'a.P12'))).toBeNull());
});
