import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PessoaData {
  nome: string;
  rg?: string | null;
  cpf_cnpj?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  estado?: string | null;
  cep?: string | null;
}

interface VeiculoData {
  placa?: string | null;
  renavan?: number | null;
  fabricante?: string | null;
  modelo?: string | null;
  chassi?: string | null;
}

interface ProcuracaoPrintProps {
  outorgante: PessoaData;
  outorgado: PessoaData;
  veiculos: VeiculoData[];
  servico: string;
}

function formatDateExtended(): string {
  const now = new Date();
  return format(now, "'Recife,' dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function formatEndereco(p: PessoaData): string {
  const parts = [p.logradouro];
  if (p.numero) parts.push(p.numero);
  if (p.complemento) parts.push(p.complemento);
  return parts.filter(Boolean).join(", ");
}

export const ProcuracaoPrint = forwardRef<HTMLDivElement, ProcuracaoPrintProps>(
  ({ outorgante, outorgado, veiculos, servico }, ref) => {
    return (
      <div ref={ref} className="p-12 bg-white text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12pt", lineHeight: "1.8", maxWidth: "210mm", margin: "0 auto" }}>
        {/* Título */}
        <h1 style={{ textAlign: "center", fontSize: "14pt", fontWeight: "bold", textDecoration: "underline", marginBottom: "40px" }}>
          PROCURAÇÃO PARTICULAR
        </h1>

        {/* Outorgante */}
        <p style={{ fontSize: "12pt", fontWeight: "bold", textDecoration: "underline", marginBottom: "8px" }}>
          OUTORGANTE <span style={{ fontWeight: "normal", textDecoration: "none" }}>(Proprietário do Veículo)</span>
        </p>
        <div style={{ marginBottom: "30px" }}>
          <p>Nome (Completo): <strong>{outorgante.nome?.toUpperCase()}</strong></p>
          <p>RG: {outorgante.rg || "___________"} &nbsp;&nbsp; Org. Emissor: SSP/PE &nbsp;&nbsp; CPF/CNPJ: {outorgante.cpf_cnpj || "_______________"}</p>
          <p>Endereço: {formatEndereco(outorgante) || "___________________________"}</p>
          <p>BAIRRO: {outorgante.bairro?.toUpperCase() || "___________"} &nbsp; CIDADE: {outorgante.municipio?.toUpperCase() || "___________"} &nbsp; UF: {outorgante.estado?.toUpperCase() || "__"} &nbsp; CEP: {outorgante.cep || "___________"}</p>
        </div>

        {/* Outorgado */}
        <p style={{ fontSize: "12pt", fontWeight: "bold", textDecoration: "underline", marginBottom: "8px" }}>
          OUTORGADO:
        </p>
        <div style={{ marginBottom: "30px" }}>
          <p>Nome (Completo): <strong>{outorgado.nome?.toUpperCase()}</strong></p>
          <p>RG: {outorgado.rg || "___________"} &nbsp;&nbsp; Org. Emissor: SSP/PE &nbsp;&nbsp; CPF/CNPJ: {outorgado.cpf_cnpj || "_______________"}</p>
          <p>Endereço: {formatEndereco(outorgado) || "___________________________"}</p>
          <p>BAIRRO: {outorgado.bairro?.toUpperCase() || "___________"} &nbsp; CIDADE: {outorgado.municipio?.toUpperCase() || "___________"} &nbsp; UF: {outorgado.estado?.toUpperCase() || "__"} &nbsp; CEP: {outorgado.cep || "___________"}</p>
        </div>

        {/* Veículos */}
        <p style={{ fontSize: "12pt", fontWeight: "bold", textDecoration: "underline", marginBottom: "8px" }}>
          DADOS DO(S) VEÍCULO(S):
        </p>
        {veiculos.map((v, i) => (
          <div key={i} style={{ marginBottom: "16px" }}>
            <p>PLACA: <strong>{v.placa || "___________"}</strong> &nbsp;&nbsp; RENAVAM: <strong>{v.renavan || "___________"}</strong></p>
            <p>MARCA/MODELO: <strong>{[v.fabricante, v.modelo].filter(Boolean).join("/") || "___________"}</strong></p>
            <p>CHASSI: <strong>{v.chassi || "___________"}</strong></p>
            {i < veiculos.length - 1 && <hr style={{ margin: "8px 0", borderColor: "#ccc" }} />}
          </div>
        ))}

        {/* Texto padrão */}
        <p style={{ textIndent: "40px", marginTop: "30px" }}>
          Com poderes de representação junto ao Detran/PE e/ou Ciretrans com fins específicos para realizar os seguintes serviços:
        </p>

        <p style={{ fontWeight: "bold", fontSize: "12pt", textAlign: "center", margin: "20px 0" }}>
          {servico.toUpperCase()}
        </p>

        <p style={{ textIndent: "40px" }}>
          Podendo, para tanto, assinar, requerer, desistir, receber documentos, enfim tudo fazer e praticar o fiel cumprimento e desempenho do presente mandato.
        </p>

        {/* Local e Data */}
        <p style={{ textAlign: "center", marginTop: "50px", textTransform: "uppercase" }}>
          {formatDateExtended().toUpperCase()}
        </p>

        {/* Assinatura */}
        <div style={{ marginTop: "80px", textAlign: "center" }}>
          <div style={{ borderTop: "1px solid black", width: "60%", margin: "0 auto" }} />
          <p style={{ marginTop: "4px" }}>Assinatura do Outorgante (Proprietário do Veículo)</p>
        </div>
      </div>
    );
  }
);

ProcuracaoPrint.displayName = "ProcuracaoPrint";
