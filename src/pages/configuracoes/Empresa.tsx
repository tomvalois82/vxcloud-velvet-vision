import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuperUser } from "@/hooks/useSuperUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Upload, Building2, MapPin, Phone, Mail, Globe } from "lucide-react";
import { Navigate } from "react-router-dom";
import { maskCEP, maskCNPJ, maskCPF, maskPhone } from "@/features/pessoas/utils/masks";

interface EmpresaData {
  id: string;
  tipo_pessoa: string;
  cnpj: string | null;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string | null;
  site: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  estado: string;
  ponto_referencia: string | null;
  foto_url: string | null;
  id_config: number;
}

const estadosBrasileiros = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const Empresa = () => {
  const { isSuperUser, loading: loadingSuperUser } = useSuperUser();
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSuperUser) {
      fetchEmpresa();
    }
  }, [isSuperUser]);

  const fetchEmpresa = async () => {
    try {
      const { data, error } = await supabase
        .from('empresa')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setEmpresa(data);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
      toast.error('Erro ao carregar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof EmpresaData, value: string) => {
    if (!empresa) return;
    
    let formattedValue = value;
    
    if (field === 'cep') {
      formattedValue = maskCEP(value);
    } else if (field === 'cnpj') {
      formattedValue = empresa.tipo_pessoa === 'PJ' ? maskCNPJ(value) : maskCPF(value);
    } else if (field === 'telefone') {
      formattedValue = maskPhone(value);
    }
    
    setEmpresa({ ...empresa, [field]: formattedValue });
  };

  const handleSave = async () => {
    if (!empresa) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('empresa')
        .update({
          tipo_pessoa: empresa.tipo_pessoa,
          cnpj: empresa.cnpj,
          razao_social: empresa.razao_social,
          nome_fantasia: empresa.nome_fantasia,
          email: empresa.email,
          telefone: empresa.telefone,
          site: empresa.site,
          cep: empresa.cep,
          logradouro: empresa.logradouro,
          numero: empresa.numero,
          complemento: empresa.complemento,
          bairro: empresa.bairro,
          municipio: empresa.municipio,
          estado: empresa.estado,
          ponto_referencia: empresa.ponto_referencia,
          foto_url: empresa.foto_url,
        })
        .eq('id', empresa.id);

      if (error) throw error;
      toast.success('Empresa atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar dados da empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresa) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `empresa-${empresa.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('empresa')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('empresa')
        .getPublicUrl(filePath);

      setEmpresa({ ...empresa, foto_url: publicUrl });
      toast.success('Logo carregada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao carregar logo');
    } finally {
      setUploading(false);
    }
  };

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      if (empresa) {
        setEmpresa({
          ...empresa,
          logradouro: data.logradouro || empresa.logradouro,
          bairro: data.bairro || empresa.bairro,
          municipio: data.localidade || empresa.municipio,
          estado: data.uf || empresa.estado,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  if (loadingSuperUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isSuperUser) {
    return <Navigate to="/configuracoes" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Empresa" description="Dados cadastrais da empresa" />
        <Card className="glass border-border/50">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Empresa" description="Gerencie os dados cadastrais da empresa" />

      <div className="space-y-6">
        {/* Logo e Identificação */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-accent" />
              Identificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden">
                  {empresa.foto_url ? (
                    <img 
                      src={empresa.foto_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? 'Enviando...' : 'Alterar Logo'}
                </Button>
              </div>

              {/* Dados principais */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <Select
                    value={empresa.tipo_pessoa}
                    onValueChange={(value) => handleChange('tipo_pessoa', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                      <SelectItem value="PF">Pessoa Física</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{empresa.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}</Label>
                  <Input
                    value={empresa.cnpj || ''}
                    onChange={(e) => handleChange('cnpj', e.target.value)}
                    placeholder={empresa.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Razão Social *</Label>
                  <Input
                    value={empresa.razao_social}
                    onChange={(e) => handleChange('razao_social', e.target.value)}
                    placeholder="Razão social da empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome Fantasia *</Label>
                  <Input
                    value={empresa.nome_fantasia}
                    onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                    placeholder="Nome fantasia"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Phone className="w-5 h-5 text-accent" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-mail *
                </Label>
                <Input
                  type="email"
                  value={empresa.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </Label>
                <Input
                  value={empresa.telefone || ''}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Site
                </Label>
                <Input
                  value={empresa.site || ''}
                  onChange={(e) => handleChange('site', e.target.value)}
                  placeholder="www.empresa.com.br"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MapPin className="w-5 h-5 text-accent" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>CEP *</Label>
                <Input
                  value={empresa.cep}
                  onChange={(e) => handleChange('cep', e.target.value)}
                  onBlur={(e) => buscarCEP(e.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Logradouro *</Label>
                <Input
                  value={empresa.logradouro}
                  onChange={(e) => handleChange('logradouro', e.target.value)}
                  placeholder="Rua, Avenida..."
                />
              </div>

              <div className="space-y-2">
                <Label>Número *</Label>
                <Input
                  value={empresa.numero}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  placeholder="Nº"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Complemento</Label>
                <Input
                  value={empresa.complemento || ''}
                  onChange={(e) => handleChange('complemento', e.target.value)}
                  placeholder="Sala, Andar..."
                />
              </div>

              <div className="space-y-2">
                <Label>Bairro *</Label>
                <Input
                  value={empresa.bairro}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  placeholder="Bairro"
                />
              </div>

              <div className="space-y-2">
                <Label>Município *</Label>
                <Input
                  value={empresa.municipio}
                  onChange={(e) => handleChange('municipio', e.target.value)}
                  placeholder="Cidade"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Estado *</Label>
                <Select
                  value={empresa.estado}
                  onValueChange={(value) => handleChange('estado', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosBrasileiros.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Ponto de Referência</Label>
                <Input
                  value={empresa.ponto_referencia || ''}
                  onChange={(e) => handleChange('ponto_referencia', e.target.value)}
                  placeholder="Próximo a..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Empresa;
