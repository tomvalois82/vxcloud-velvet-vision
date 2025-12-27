import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useSuperUser } from '@/hooks/useSuperUser';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Building2, Loader2, Search } from 'lucide-react';
import { maskCNPJ, maskCPF, maskCEP, maskPhone } from '@/features/pessoas/utils/masks';

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  tipo_pessoa: string;
  cnpj: string | null;
  email: string;
  telefone: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  estado: string;
  ponto_referencia: string | null;
  site: string | null;
  foto_url: string | null;
  id_config: number;
}

interface Config {
  id: number;
  empresa: string | null;
}

const emptyEmpresa: Omit<Empresa, 'id'> = {
  razao_social: '',
  nome_fantasia: '',
  tipo_pessoa: 'Pessoa Jurídica',
  cnpj: '',
  email: '',
  telefone: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  estado: '',
  ponto_referencia: '',
  site: '',
  foto_url: '',
  id_config: 0,
};

export default function GerenciarEmpresas() {
  const navigate = useNavigate();
  const { isSuperUser, loading: loadingSuperUser } = useSuperUser();
  const { toast } = useToast();
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<Empresa | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<Partial<Empresa> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loadingSuperUser && !isSuperUser) {
      navigate('/');
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      });
    }
  }, [isSuperUser, loadingSuperUser, navigate, toast]);

  useEffect(() => {
    if (isSuperUser) {
      fetchData();
    }
  }, [isSuperUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empresasRes, configsRes] = await Promise.all([
        supabase.from('empresa').select('*').order('nome_fantasia'),
        supabase.from('config').select('id, empresa'),
      ]);

      if (empresasRes.error) throw empresasRes.error;
      if (configsRes.error) throw configsRes.error;

      setEmpresas(empresasRes.data || []);
      setConfigs(configsRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar empresas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Empresa, value: string) => {
    if (!editingEmpresa) return;

    let formattedValue = value;
    if (field === 'cep') {
      formattedValue = maskCEP(value);
    } else if (field === 'cnpj') {
      formattedValue = editingEmpresa.tipo_pessoa === 'Pessoa Jurídica' ? maskCNPJ(value) : maskCPF(value);
    } else if (field === 'telefone') {
      formattedValue = maskPhone(value);
    }

    setEditingEmpresa({ ...editingEmpresa, [field]: formattedValue });
  };

  const handleNew = () => {
    setEditingEmpresa({ ...emptyEmpresa });
    setDialogOpen(true);
  };

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa({ ...empresa });
    setDialogOpen(true);
  };

  const handleDelete = (empresa: Empresa) => {
    setEmpresaToDelete(empresa);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!empresaToDelete) return;

    try {
      const { error } = await supabase
        .from('empresa')
        .delete()
        .eq('id', empresaToDelete.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Empresa excluída com sucesso.',
      });

      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir empresa.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setEmpresaToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!editingEmpresa) return;

    if (!editingEmpresa.razao_social || !editingEmpresa.nome_fantasia || !editingEmpresa.email || !editingEmpresa.id_config) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        razao_social: editingEmpresa.razao_social,
        nome_fantasia: editingEmpresa.nome_fantasia,
        tipo_pessoa: editingEmpresa.tipo_pessoa || 'Pessoa Jurídica',
        cnpj: editingEmpresa.cnpj || null,
        email: editingEmpresa.email,
        telefone: editingEmpresa.telefone || null,
        cep: editingEmpresa.cep || '',
        logradouro: editingEmpresa.logradouro || '',
        numero: editingEmpresa.numero || '',
        complemento: editingEmpresa.complemento || null,
        bairro: editingEmpresa.bairro || '',
        municipio: editingEmpresa.municipio || '',
        estado: editingEmpresa.estado || '',
        ponto_referencia: editingEmpresa.ponto_referencia || null,
        site: editingEmpresa.site || null,
        foto_url: editingEmpresa.foto_url || null,
        id_config: editingEmpresa.id_config,
      };

      if (editingEmpresa.id) {
        const { error } = await supabase
          .from('empresa')
          .update(dataToSave)
          .eq('id', editingEmpresa.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Empresa atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('empresa')
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Empresa criada com sucesso.',
        });
      }

      setDialogOpen(false);
      setEditingEmpresa(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar empresa.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredEmpresas = empresas.filter(
    (e) =>
      e.nome_fantasia.toLowerCase().includes(search.toLowerCase()) ||
      e.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      (e.cnpj && e.cnpj.includes(search))
  );

  if (loadingSuperUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciar Empresas"
        description="Gerencie todas as empresas do sistema"
        action={
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEmpresas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-2" />
              <p>Nenhuma empresa encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Config</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpresas.map((empresa) => (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-medium">{empresa.nome_fantasia}</TableCell>
                      <TableCell>{empresa.razao_social}</TableCell>
                      <TableCell>{empresa.cnpj}</TableCell>
                      <TableCell>{empresa.email}</TableCell>
                      <TableCell>{empresa.telefone}</TableCell>
                      <TableCell>{empresa.id_config}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(empresa)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição/Criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmpresa?.id ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
          </DialogHeader>

          {editingEmpresa && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Configuração *</Label>
                <Select
                  value={editingEmpresa.id_config?.toString() || ''}
                  onValueChange={(value) => setEditingEmpresa({ ...editingEmpresa, id_config: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma configuração" />
                  </SelectTrigger>
                  <SelectContent>
                    {configs.map((config) => (
                      <SelectItem key={config.id} value={config.id.toString()}>
                        {config.id} - {config.empresa || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Pessoa *</Label>
                <Select
                  value={editingEmpresa.tipo_pessoa || 'Pessoa Jurídica'}
                  onValueChange={(value) => setEditingEmpresa({ ...editingEmpresa, tipo_pessoa: value, cnpj: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                    <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input
                  value={editingEmpresa.razao_social || ''}
                  onChange={(e) => handleChange('razao_social', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Nome Fantasia *</Label>
                <Input
                  value={editingEmpresa.nome_fantasia || ''}
                  onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{editingEmpresa.tipo_pessoa === 'Pessoa Jurídica' ? 'CNPJ' : 'CPF'}</Label>
                <Input
                  value={editingEmpresa.cnpj || ''}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                  placeholder={editingEmpresa.tipo_pessoa === 'Pessoa Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'}
                />
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editingEmpresa.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editingEmpresa.telefone || ''}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label>Site</Label>
                <Input
                  value={editingEmpresa.site || ''}
                  onChange={(e) => handleChange('site', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="col-span-full">
                <h4 className="font-medium mb-4 text-lg border-b pb-2">Endereço</h4>
              </div>

              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={editingEmpresa.cep || ''}
                  onChange={(e) => handleChange('cep', e.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2">
                <Label>Logradouro</Label>
                <Input
                  value={editingEmpresa.logradouro || ''}
                  onChange={(e) => handleChange('logradouro', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={editingEmpresa.numero || ''}
                  onChange={(e) => handleChange('numero', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input
                  value={editingEmpresa.complemento || ''}
                  onChange={(e) => handleChange('complemento', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={editingEmpresa.bairro || ''}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Município</Label>
                <Input
                  value={editingEmpresa.municipio || ''}
                  onChange={(e) => handleChange('municipio', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={editingEmpresa.estado || ''}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  maxLength={2}
                  placeholder="UF"
                />
              </div>

              <div className="space-y-2">
                <Label>Ponto de Referência</Label>
                <Input
                  value={editingEmpresa.ponto_referencia || ''}
                  onChange={(e) => handleChange('ponto_referencia', e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa "{empresaToDelete?.nome_fantasia}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
