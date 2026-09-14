import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Loader2 } from "lucide-react";

const PAGINAS_SISTEMA = [
  { path: "/", label: "Dashboard" },
  { path: "/veiculos/estoque", label: "Veículos - Estoque" },
  { path: "/veiculos/relatorios", label: "Veículos - Relatórios" },
  { path: "/pessoas", label: "Pessoas" },
  { path: "/financeiras", label: "Financeiras" },
  { path: "/investidores", label: "Investidores - Investimentos" },
  { path: "/investidores/carteiras", label: "Investidores - Carteiras" },
  { path: "/vendas", label: "Vendas - Listagem" },
  { path: "/vendas/relatorios", label: "Vendas - Relatórios" },
  { path: "/compras", label: "Compras - Listagem" },
  { path: "/financeiro", label: "Financeiro - Painel" },
  { path: "/financeiro/contas", label: "Financeiro - Contas" },
  { path: "/financeiro/cartoes", label: "Financeiro - Cartões" },
  { path: "/financeiro/categorias", label: "Financeiro - Categorias" },
  { path: "/financeiro/pagar", label: "Financeiro - A Pagar" },
  { path: "/financeiro/receber", label: "Financeiro - A Receber" },
  { path: "/financeiro/transferencias", label: "Financeiro - Transferências" },
  { path: "/financeiro/dre", label: "Financeiro - DRE" },
  { path: "/financeiro/margem", label: "Financeiro - Margem" },
  { path: "/financeiro/relatorios", label: "Financeiro - Relatório de Estoque" },
  { path: "/contabilidade/plano", label: "Contabilidade - Plano de Contas" },
  { path: "/administrativo/procuracao", label: "Administrativo - Procuração" },
  { path: "/configuracoes", label: "Configurações" },
];

const Acesso = () => {
  const [cargos, setCargos] = useState<string[]>([]);
  const [cargoSelecionado, setCargoSelecionado] = useState<string>("");
  const [permissoes, setPermissoes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoCargo, setNovoCargo] = useState("");
  const [addingCargo, setAddingCargo] = useState(false);

  // Load cargos from enum
  useEffect(() => {
    async function fetchCargos() {
      const { data, error } = await supabase.rpc("get_enum_values" as any, { enum_name: "cargos" });
      if (error) {
        // Fallback: use known values from types
        setCargos(["Gerente", "Supervisor", "Vendedor", "Avaliador"]);
      } else {
        setCargos((data as any[]).map((d: any) => d.enum_value || d));
      }
    }
    fetchCargos();
  }, []);

  // Load permissions when cargo changes
  useEffect(() => {
    if (!cargoSelecionado) return;
    async function fetchPermissoes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("vx_acesso_paginas")
        .select("pagina, permitido")
        .eq("cargo", cargoSelecionado);

      if (error) {
        toast.error("Erro ao carregar permissões");
        setLoading(false);
        return;
      }

      const map: Record<string, boolean> = {};
      PAGINAS_SISTEMA.forEach((p) => {
        map[p.path] = true; // default all allowed
      });
      if (data) {
        data.forEach((row) => {
          map[row.pagina] = row.permitido;
        });
      }
      setPermissoes(map);
      setLoading(false);
    }
    fetchPermissoes();
  }, [cargoSelecionado]);

  const handleToggle = (path: string) => {
    setPermissoes((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleSave = async () => {
    if (!cargoSelecionado) {
      toast.error("Selecione um cargo");
      return;
    }
    setSaving(true);
    try {
      // Delete existing permissions for this cargo
      await supabase
        .from("vx_acesso_paginas")
        .delete()
        .eq("cargo", cargoSelecionado);

      // Insert all permissions
      const rows = PAGINAS_SISTEMA.map((p) => ({
        cargo: cargoSelecionado,
        pagina: p.path,
        permitido: permissoes[p.path] ?? true,
      }));

      const { error } = await supabase.from("vx_acesso_paginas").insert(rows);
      if (error) throw error;
      toast.success("Permissões salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCargo = async () => {
    if (!novoCargo.trim()) return;
    setAddingCargo(true);
    try {
      const cargoFormatted = novoCargo.trim();
      // Add to enum via raw SQL through a migration-like approach
      // Since we can't alter enums from client, we'll use the cargo as text in the table
      // The cargo field in vx_acesso_paginas is text, so any value works
      setCargos((prev) => [...prev, cargoFormatted]);
      setDialogOpen(false);
      setNovoCargo("");
      setCargoSelecionado(cargoFormatted);
      toast.success(`Cargo "${cargoFormatted}" adicionado!`);
    } catch (error: any) {
      toast.error("Erro ao adicionar cargo: " + error.message);
    } finally {
      setAddingCargo(false);
    }
  };

  const handleSelectAll = () => {
    const allTrue = PAGINAS_SISTEMA.every((p) => permissoes[p.path]);
    const newVal = !allTrue;
    const map: Record<string, boolean> = {};
    PAGINAS_SISTEMA.forEach((p) => {
      map[p.path] = newVal;
    });
    setPermissoes(map);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Controle de Acesso"
        description="Configure as permissões de acesso por cargo"
      />

      <div className="space-y-6">
        {/* Cargo selector */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-xs">
            <Label className="text-muted-foreground mb-2 block">Cargo</Label>
            <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                {cargos.map((cargo) => (
                  <SelectItem key={cargo} value={cargo}>
                    {cargo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDialogOpen(true)}
              title="Adicionar cargo"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Pages list */}
        {cargoSelecionado && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
              <span className="text-sm font-medium text-foreground">
                Páginas do Sistema
              </span>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {PAGINAS_SISTEMA.every((p) => permissoes[p.path])
                  ? "Desmarcar Todos"
                  : "Marcar Todos"}
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {PAGINAS_SISTEMA.map((pagina) => (
                  <label
                    key={pagina.path}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={permissoes[pagina.path] ?? true}
                      onCheckedChange={() => handleToggle(pagina.path)}
                    />
                    <span className="text-sm text-foreground">{pagina.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {pagina.path}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        {cargoSelecionado && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Permissões
            </Button>
          </div>
        )}
      </div>

      {/* Add Cargo Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Cargo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Cargo</Label>
              <Input
                value={novoCargo}
                onChange={(e) => setNovoCargo(e.target.value)}
                placeholder="Ex: Financeiro"
                onKeyDown={(e) => e.key === "Enter" && handleAddCargo()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCargo} disabled={addingCargo || !novoCargo.trim()}>
              {addingCargo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Acesso;
