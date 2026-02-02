import { forwardRef } from "react";

interface Categoria {
  id: string;
  categoria: string;
  id_categoria_pai: string | null;
  ativo: boolean;
  operacao: string;
  dre: boolean;
  classificacao: string | null;
  children?: Categoria[];
}

interface CategoriasReportPrintProps {
  categoriasReceber: Categoria[];
  categoriasPagar: Categoria[];
}

export const CategoriasReportPrint = forwardRef<HTMLDivElement, CategoriasReportPrintProps>(
  ({ categoriasReceber, categoriasPagar }, ref) => {
    const renderCategoriaRow = (categoria: Categoria, level: number = 0) => {
      const paddingLeft = level * 20;
      const rows: JSX.Element[] = [];

      rows.push(
        <tr key={categoria.id} style={{ backgroundColor: level === 0 ? "#f9fafb" : "white" }}>
          <td style={{ padding: "8px 12px", paddingLeft: `${paddingLeft + 12}px`, borderBottom: "1px solid #e5e7eb" }}>
            {level > 0 && <span style={{ color: "#9ca3af", marginRight: "8px" }}>└</span>}
            <span style={{ fontWeight: level === 0 ? 600 : 400 }}>{categoria.categoria}</span>
          </td>
          <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
            <span style={{
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              backgroundColor: categoria.dre ? "#dcfce7" : "#fee2e2",
              color: categoria.dre ? "#166534" : "#991b1b"
            }}>
              {categoria.dre ? "Sim" : "Não"}
            </span>
          </td>
          <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "center", fontSize: "12px", color: "#6b7280" }}>
            {categoria.classificacao || "-"}
          </td>
        </tr>
      );

      if (categoria.children && categoria.children.length > 0) {
        categoria.children.forEach((child) => {
          rows.push(...renderCategoriaRow(child, level + 1));
        });
      }

      return rows;
    };

    const renderTable = (categorias: Categoria[], titulo: string, corTitulo: string) => (
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{
          fontSize: "16px",
          fontWeight: 600,
          marginBottom: "12px",
          padding: "8px 12px",
          backgroundColor: corTitulo,
          color: "white",
          borderRadius: "4px"
        }}>
          {titulo} ({categorias.length} categorias)
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 600 }}>
                Categoria
              </th>
              <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 600, width: "100px" }}>
                No DRE
              </th>
              <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 600, width: "150px" }}>
                Classificação
              </th>
            </tr>
          </thead>
          <tbody>
            {categorias.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
                  Nenhuma categoria cadastrada
                </td>
              </tr>
            ) : (
              categorias.flatMap((cat) => renderCategoriaRow(cat, 0))
            )}
          </tbody>
        </table>
      </div>
    );

    return (
      <div ref={ref} style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "#1f2937" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "2px solid #e5e7eb", paddingBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px" }}>
            Relatório de Categorias Financeiras
          </h1>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>
            Gerado em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
          </p>
        </div>

        {/* Receitas */}
        {renderTable(categoriasReceber, "Receitas (Receber)", "#16a34a")}

        {/* Despesas */}
        {renderTable(categoriasPagar, "Despesas (Pagar)", "#dc2626")}

        {/* Footer */}
        <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>
          <p>VX Cloud - Sistema de Gestão</p>
        </div>
      </div>
    );
  }
);

CategoriasReportPrint.displayName = "CategoriasReportPrint";
