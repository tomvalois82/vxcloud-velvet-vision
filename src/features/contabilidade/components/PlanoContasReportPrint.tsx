import { forwardRef } from "react";

interface PlanoContas {
  id: string;
  nome_conta: string;
  codigo_estruturado: string;
  tipo_conta: string | null;
  natureza: string | null;
  id_pai: string | null;
  children?: PlanoContas[];
}

interface PlanoContasReportPrintProps {
  contas: PlanoContas[];
}

export const PlanoContasReportPrint = forwardRef<HTMLDivElement, PlanoContasReportPrintProps>(
  ({ contas }, ref) => {
    const renderRow = (conta: PlanoContas, level: number = 0) => {
      const paddingLeft = level * 20;
      const rows: JSX.Element[] = [];

      rows.push(
        <tr key={conta.id} style={{ backgroundColor: level === 0 ? "#f9fafb" : "white" }}>
          <td style={{ padding: "8px 12px", paddingLeft: `${paddingLeft + 12}px`, borderBottom: "1px solid #e5e7eb", minWidth: "150px" }}>
            <span style={{ fontWeight: level === 0 ? 600 : 400, marginRight: "12px", color: "#6b7280", fontFamily: "monospace" }}>
              {conta.codigo_estruturado}
            </span>
            <span style={{ fontWeight: level === 0 ? 600 : 400 }}>{conta.nome_conta}</span>
          </td>
          <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "center", fontSize: "12px", color: "#6b7280" }}>
            {conta.tipo_conta || "-"}
          </td>
          <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "center", fontSize: "12px", color: "#6b7280" }}>
            {conta.natureza || "-"}
          </td>
        </tr>
      );

      if (conta.children && conta.children.length > 0) {
        conta.children.forEach((child) => {
          rows.push(...renderRow(child, level + 1));
        });
      }

      return rows;
    };

    return (
      <div ref={ref} style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "#1f2937" }}>
        <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "2px solid #e5e7eb", paddingBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px" }}>
            Plano de Contas
          </h1>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>
            Gerado em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
          </p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 600 }}>
                Conta
              </th>
              <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 600, width: "120px" }}>
                Tipo
              </th>
              <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 600, width: "120px" }}>
                Natureza
              </th>
            </tr>
          </thead>
          <tbody>
            {contas.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
                  Nenhuma conta cadastrada
                </td>
              </tr>
            ) : (
              contas.flatMap((c) => renderRow(c, 0))
            )}
          </tbody>
        </table>

        <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>
          <p>VX Cloud - Sistema de Gestão</p>
        </div>
      </div>
    );
  }
);

PlanoContasReportPrint.displayName = "PlanoContasReportPrint";
