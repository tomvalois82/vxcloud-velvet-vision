import { forwardRef, useState, useEffect } from "react";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface MovimentoDRE {
  id: string;
  descricao: string | null;
  valor_liquido: number;
  data_pagamento: string | null;
  conta_nome: string | null;
  pessoa_nome: string | null;
}

interface CategoriaComValor {
  id: string;
  categoria: string;
  operacao: string;
  id_categoria_pai: string | null;
  dre: boolean;
  ativo: boolean;
  valor: number;
  filhos: CategoriaComValor[];
  movimentos: MovimentoDRE[];
  incluirNoDre: boolean;
}

interface ResumoGeral {
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  percentualResultado: number;
}

interface Empresa {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string | null;
  telefone: string | null;
  email: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  estado: string;
  cep: string;
  foto_url: string | null;
  site: string | null;
}

interface DREReportPrintProps {
  competencia: string;
  resumo: ResumoGeral;
  categoriasDespesas: CategoriaComValor[];
  categoriasReceitas: CategoriaComValor[];
  tipoRelatorio: "sintetico" | "analitico";
  calcularTotalCategoria: (cat: CategoriaComValor) => number;
}

const DREReportPrint = forwardRef<HTMLDivElement, DREReportPrintProps>(
  ({ competencia, resumo, categoriasDespesas, categoriasReceitas, tipoRelatorio, calcularTotalCategoria }, ref) => {
    const [empresa, setEmpresa] = useState<Empresa | null>(null);

    useEffect(() => {
      const fetchEmpresa = async () => {
        const { data } = await supabase.from("empresa").select("*").limit(1).single();
        if (data) setEmpresa(data);
      };
      fetchEmpresa();
    }, []);

    const renderCategoriaRow = (cat: CategoriaComValor, nivel: number, tipo: 'despesas' | 'receitas'): JSX.Element[] => {
      if (!cat.incluirNoDre) return [];
      
      const rows: JSX.Element[] = [];
      const total = calcularTotalCategoria(cat);
      const colorClass = tipo === 'receitas' ? 'color: #22c55e;' : 'color: #ef4444;';
      
      rows.push(
        <tr key={cat.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
          <td style={{ padding: '6px 8px', paddingLeft: `${nivel * 20 + 8}px`, fontSize: '11px' }}>
            {cat.categoria}
          </td>
          <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: '11px', fontWeight: 500, ...{ color: tipo === 'receitas' ? '#22c55e' : '#ef4444' } }}>
            {maskCurrency(total)}
          </td>
        </tr>
      );

      // Render movements in analytic mode
      if (tipoRelatorio === 'analitico' && cat.movimentos.length > 0) {
        cat.movimentos.forEach(mov => {
          rows.push(
            <tr key={mov.id} style={{ backgroundColor: '#f9fafb' }}>
              <td style={{ padding: '4px 8px', paddingLeft: `${(nivel + 1) * 20 + 8}px`, fontSize: '9px', color: '#6b7280' }}>
                {mov.data_pagamento ? format(new Date(mov.data_pagamento), 'dd/MM/yy') : '-'} - {mov.descricao || '-'}
                {mov.pessoa_nome && ` (${mov.pessoa_nome})`}
              </td>
              <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '9px', color: '#6b7280' }}>
                {maskCurrency(mov.valor_liquido)}
              </td>
            </tr>
          );
        });
      }

      // Render children
      cat.filhos.forEach(filho => {
        rows.push(...renderCategoriaRow(filho, nivel + 1, tipo));
      });

      return rows;
    };

    return (
      <div ref={ref} style={{ padding: '20px', backgroundColor: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {empresa?.foto_url && (
              <img src={empresa.foto_url} alt="Logo" style={{ maxHeight: '60px', maxWidth: '120px', objectFit: 'contain' }} />
            )}
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{empresa?.nome_fantasia || 'VX Cloud'}</h1>
              {empresa && (
                <p style={{ fontSize: '10px', color: '#666', margin: '4px 0 0 0' }}>
                  {empresa.logradouro}, {empresa.numero} - {empresa.bairro} - {empresa.municipio}/{empresa.estado}
                  <br />
                  Tel: {empresa.telefone} | {empresa.site || empresa.email}
                </p>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>DRE - Demonstração do Resultado</h2>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
              Competência: {competencia}
            </p>
            <p style={{ fontSize: '10px', color: '#999', margin: '2px 0 0 0' }}>
              Emitido em: {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', borderTop: '3px solid #22c55e' }}>
            <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>Total Receitas</p>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e', margin: '4px 0 0 0' }}>
              {maskCurrency(resumo.totalReceitas)}
            </p>
          </div>
          <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', borderTop: '3px solid #ef4444' }}>
            <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>Total Despesas</p>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444', margin: '4px 0 0 0' }}>
              {maskCurrency(resumo.totalDespesas)}
            </p>
          </div>
          <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', borderTop: `3px solid ${resumo.resultado >= 0 ? '#22c55e' : '#ef4444'}` }}>
            <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>Resultado</p>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: resumo.resultado >= 0 ? '#22c55e' : '#ef4444', margin: '4px 0 0 0' }}>
              {maskCurrency(resumo.resultado)}
            </p>
          </div>
          <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', borderTop: `3px solid ${resumo.percentualResultado >= 0 ? '#22c55e' : '#ef4444'}` }}>
            <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>Percentual</p>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: resumo.percentualResultado >= 0 ? '#22c55e' : '#ef4444', margin: '4px 0 0 0' }}>
              {resumo.percentualResultado.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Despesas */}
          <div>
            <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px 8px 0 0', borderBottom: '2px solid #ef4444' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444', margin: 0 }}>
                DESPESAS
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Categoria</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {categoriasDespesas.flatMap(cat => renderCategoriaRow(cat, 0, 'despesas'))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#fef2f2', fontWeight: 'bold' }}>
                  <td style={{ padding: '10px 8px' }}>TOTAL DESPESAS</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#ef4444' }}>
                    {maskCurrency(resumo.totalDespesas)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Receitas */}
          <div>
            <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px 8px 0 0', borderBottom: '2px solid #22c55e' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#22c55e', margin: 0 }}>
                RECEITAS
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Categoria</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {categoriasReceitas.flatMap(cat => renderCategoriaRow(cat, 0, 'receitas'))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f0fdf4', fontWeight: 'bold' }}>
                  <td style={{ padding: '10px 8px' }}>TOTAL RECEITAS</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#22c55e' }}>
                    {maskCurrency(resumo.totalReceitas)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Final Result */}
        <div style={{ marginTop: '20px', padding: '15px', border: '2px solid #000', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>RESULTADO DO EXERCÍCIO</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: resumo.resultado >= 0 ? '#22c55e' : '#ef4444' }}>
                {maskCurrency(resumo.resultado)}
              </span>
              <span style={{ marginLeft: '15px', fontSize: '14px', color: resumo.percentualResultado >= 0 ? '#22c55e' : '#ef4444' }}>
                ({resumo.percentualResultado.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DREReportPrint.displayName = "DREReportPrint";

export default DREReportPrint;
