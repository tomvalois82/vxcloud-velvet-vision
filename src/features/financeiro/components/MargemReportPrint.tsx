import { forwardRef } from "react";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VendaAnalitica {
  id: string;
  data_venda: string;
  veiculo: {
    id: number;
    placa: string | null;
    fabricante: string | null;
    modelo: string | null;
    ano: string | null;
    cor: string | null;
    tipo_aquisicao: string;
  };
  cliente: {
    nome: string;
  };
  vendedor: {
    nome: string;
  } | null;
  valor_venda: number;
  valor_compra: number;
  custos_veiculo: number;
  produtos_servicos: number;
  receitas_veiculo: number;
  retornos_financiamento: number;
  margem: number;
  margem_percentual: number;
}

interface ResumoSintetico {
  totalNegociacoes: number;
  vendasProprios: number;
  vendasConsignados: number;
  intermediacoes: number;
  produtosServicos: number;
  receitasVeiculos: number;
  retornosFinanciamentos: number;
  totalReceitas: number;
  compras: number;
  fechamentosConsignacao: number;
  comissoes: number;
  despesasVeiculo: number;
  posVenda: number;
  totalDespesas: number;
  margem: number;
  margemPercentual: number;
}

interface MargemReportPrintProps {
  tipoRelatorio: "sintetico" | "analitico";
  mesLabel: string;
  ano: string;
  vendedorLabel: string;
  resumoSintetico: ResumoSintetico;
  vendasAnaliticas: VendaAnalitica[];
}

const MargemReportPrint = forwardRef<HTMLDivElement, MargemReportPrintProps>(
  ({ tipoRelatorio, mesLabel, ano, vendedorLabel, resumoSintetico, vendasAnaliticas }, ref) => {
    const getVeiculoDisplayName = (veiculo: VendaAnalitica["veiculo"]) => {
      const parts = [veiculo.tipo_aquisicao?.toUpperCase(), veiculo.placa, veiculo.fabricante, veiculo.modelo, veiculo.cor, veiculo.ano].filter(Boolean);
      return parts.join(" ") || "Veículo sem nome";
    };

    return (
      <div ref={ref} className="print-container" style={{ backgroundColor: "#fff", color: "#000", padding: "20px" }}>
        <style>
          {`
            @media print {
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-container {
                font-family: Arial, sans-serif;
              }
              .no-print {
                display: none !important;
              }
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            .print-table th, .print-table td {
              border: 1px solid #ddd;
              padding: 6px 8px;
              text-align: left;
            }
            .print-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .print-table .text-right {
              text-align: right;
            }
            .print-table .total-row {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .positive { color: #16a34a; }
            .negative { color: #dc2626; }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .summary-section {
              border: 1px solid #ddd;
              border-radius: 4px;
              overflow: hidden;
            }
            .summary-header {
              padding: 8px 12px;
              font-weight: bold;
              border-bottom: 1px solid #ddd;
            }
            .summary-header.receitas { background-color: #dcfce7; }
            .summary-header.despesas { background-color: #fee2e2; }
            .summary-body { padding: 10px 12px; }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              border-bottom: 1px solid #eee;
            }
            .summary-row:last-child { border-bottom: none; }
            .summary-total {
              border-top: 2px solid #333;
              margin-top: 8px;
              padding-top: 8px;
              font-weight: bold;
            }
            .cards-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .card {
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 12px;
            }
            .card-title { font-size: 12px; color: #666; margin-bottom: 4px; }
            .card-value { font-size: 18px; font-weight: bold; }
          `}
        </style>

        {/* Header */}
        <div style={{ marginBottom: "20px", borderBottom: "2px solid #333", paddingBottom: "10px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
            Relatório de Margem - {tipoRelatorio === "sintetico" ? "Sintético" : "Analítico"}
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "13px" }}>
            <div>
              <strong>Referência:</strong> {mesLabel} {ano}
            </div>
            <div>
              <strong>Vendedor:</strong> {vendedorLabel}
            </div>
            <div>
              <strong>Gerado em:</strong> {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>
          </div>
          <div style={{ marginTop: "5px", fontSize: "13px" }}>
            <strong>Total de Negociações:</strong> {resumoSintetico.totalNegociacoes}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="cards-grid">
          <div className="card" style={{ borderLeft: "4px solid #16a34a" }}>
            <div className="card-title">Total Receitas</div>
            <div className="card-value positive">{maskCurrency(resumoSintetico.totalReceitas)}</div>
          </div>
          <div className="card" style={{ borderLeft: "4px solid #dc2626" }}>
            <div className="card-title">Total Despesas</div>
            <div className="card-value negative">{maskCurrency(resumoSintetico.totalDespesas)}</div>
          </div>
          <div className="card" style={{ borderLeft: `4px solid ${resumoSintetico.margem >= 0 ? "#16a34a" : "#dc2626"}` }}>
            <div className="card-title">Margem</div>
            <div className={`card-value ${resumoSintetico.margem >= 0 ? "positive" : "negative"}`}>
              {maskCurrency(resumoSintetico.margem)} ({resumoSintetico.margemPercentual.toFixed(0)}%)
            </div>
          </div>
        </div>

        {tipoRelatorio === "sintetico" ? (
          /* Synthetic View */
          <div className="summary-grid">
            {/* Receitas */}
            <div className="summary-section">
              <div className="summary-header receitas">Receitas</div>
              <div className="summary-body">
                <div className="summary-row">
                  <span>Vendas Próprios</span>
                  <span>{maskCurrency(resumoSintetico.vendasProprios)}</span>
                </div>
                <div className="summary-row">
                  <span>Vendas Consignados</span>
                  <span>{maskCurrency(resumoSintetico.vendasConsignados)}</span>
                </div>
                <div className="summary-row">
                  <span>Intermediações</span>
                  <span>{maskCurrency(resumoSintetico.intermediacoes)}</span>
                </div>
                <div className="summary-row">
                  <span>Outros Produtos e Serviços</span>
                  <span>{maskCurrency(resumoSintetico.produtosServicos)}</span>
                </div>
                <div className="summary-row">
                  <span>Receitas com Veículos</span>
                  <span>{maskCurrency(resumoSintetico.receitasVeiculos)}</span>
                </div>
                <div className="summary-row">
                  <span>Retornos com Financiamentos</span>
                  <span>{maskCurrency(resumoSintetico.retornosFinanciamentos)}</span>
                </div>
                <div className="summary-row summary-total positive">
                  <span>Total Receitas</span>
                  <span>{maskCurrency(resumoSintetico.totalReceitas)}</span>
                </div>
              </div>
            </div>

            {/* Despesas */}
            <div className="summary-section">
              <div className="summary-header despesas">Despesas</div>
              <div className="summary-body">
                <div className="summary-row">
                  <span>Compras</span>
                  <span>{maskCurrency(resumoSintetico.compras)}</span>
                </div>
                <div className="summary-row">
                  <span>Fechamentos Consignação</span>
                  <span>{maskCurrency(resumoSintetico.fechamentosConsignacao)}</span>
                </div>
                <div className="summary-row">
                  <span>Comissões</span>
                  <span>{maskCurrency(resumoSintetico.comissoes)}</span>
                </div>
                <div className="summary-row">
                  <span>Despesas Veículo</span>
                  <span>{maskCurrency(resumoSintetico.despesasVeiculo)}</span>
                </div>
                <div className="summary-row">
                  <span>Pós Venda</span>
                  <span>{maskCurrency(resumoSintetico.posVenda)}</span>
                </div>
                <div className="summary-row summary-total negative">
                  <span>Total Despesas</span>
                  <span>{maskCurrency(resumoSintetico.totalDespesas)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Analytical View */
          <table className="print-table">
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Cliente</th>
                <th className="text-right">Venda</th>
                <th className="text-right">Prod./Serv.</th>
                <th className="text-right">Retornos</th>
                <th className="text-right">Receitas</th>
                <th className="text-right">Compra</th>
                <th className="text-right">Custos</th>
                <th className="text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {vendasAnaliticas.map((venda) => (
                <tr key={venda.id}>
                  <td>
                    <div style={{ fontSize: "10px" }}>
                      <strong>{getVeiculoDisplayName(venda.veiculo)}</strong>
                      <br />
                      <span style={{ color: "#666" }}>
                        {format(new Date(venda.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: "10px" }}>{venda.cliente.nome}</td>
                  <td className="text-right">{maskCurrency(venda.valor_venda)}</td>
                  <td className="text-right">{maskCurrency(venda.produtos_servicos)}</td>
                  <td className="text-right">{maskCurrency(venda.retornos_financiamento)}</td>
                  <td className="text-right">{maskCurrency(venda.receitas_veiculo)}</td>
                  <td className="text-right negative">{maskCurrency(venda.valor_compra)}</td>
                  <td className="text-right negative">{maskCurrency(venda.custos_veiculo)}</td>
                  <td className={`text-right ${venda.margem >= 0 ? "positive" : "negative"}`}>
                    {maskCurrency(venda.margem)}
                    <br />
                    <span style={{ fontSize: "9px" }}>{venda.margem_percentual.toFixed(0)}%</span>
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="total-row">
                <td colSpan={2}>
                  <strong>TOTAL ({vendasAnaliticas.length} vendas)</strong>
                </td>
                <td className="text-right">
                  {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.valor_venda, 0))}
                </td>
                <td className="text-right">
                  {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.produtos_servicos, 0))}
                </td>
                <td className="text-right">
                  {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.retornos_financiamento, 0))}
                </td>
                <td className="text-right">
                  {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.receitas_veiculo, 0))}
                </td>
                <td className="text-right negative">
                  {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.valor_compra, 0))}
                </td>
                <td className="text-right negative">
                  {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.custos_veiculo, 0))}
                </td>
                <td className={`text-right ${resumoSintetico.margem >= 0 ? "positive" : "negative"}`}>
                  {maskCurrency(resumoSintetico.margem)}
                  <br />
                  <span style={{ fontSize: "9px" }}>{resumoSintetico.margemPercentual.toFixed(0)}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    );
  }
);

MargemReportPrint.displayName = "MargemReportPrint";

export default MargemReportPrint;
