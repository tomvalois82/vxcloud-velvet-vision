import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { consultarCep } from "../services/viacepService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { maskCPF, maskCNPJ, maskCEP, maskPhone, unmaskCPFCNPJ } from "../utils/masks";
import { validateCPF, validateCNPJ, validateCPFCNPJDuplicate } from "../utils/validations";

const pessoaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo_cadastro: z.enum(["Pessoa Física", "Pessoa Jurídica"]),
  cpf_cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  municipio: z.string().optional(),
  estado: z.string().optional(),
  ponto_referencia: z.string().optional(),
  descricao: z.string().optional(),
  eh_cliente: z.boolean(),
  eh_fornecedor: z.boolean(),
  eh_colaborador: z.boolean(),
});

type PessoaFormData = z.infer<typeof pessoaSchema>;

interface PessoaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoa?: any;
  onSuccess: () => void;
}

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function PessoaDialog({ open, onOpenChange, pessoa, onSuccess }: PessoaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cpfCnpjError, setCpfCnpjError] = useState<string>("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string>("");
  const [enderecoEditavel, setEnderecoEditavel] = useState(false);

  const form = useForm<PessoaFormData>({
    resolver: zodResolver(pessoaSchema),
    defaultValues: {
      nome: pessoa?.nome || "",
      tipo_cadastro: pessoa?.tipo_cadastro || "Pessoa Física",
      cpf_cnpj: pessoa?.cpf_cnpj ? (pessoa.cpf_cnpj.length === 11 ? maskCPF(pessoa.cpf_cnpj) : maskCNPJ(pessoa.cpf_cnpj)) : "",
      telefone: pessoa?.telefone ? maskPhone(pessoa.telefone) : "",
      email: pessoa?.email || "",
      cep: pessoa?.cep ? maskCEP(pessoa.cep) : "",
      logradouro: pessoa?.logradouro || "",
      numero: pessoa?.numero || "",
      complemento: pessoa?.complemento || "",
      bairro: pessoa?.bairro || "",
      municipio: pessoa?.municipio || "",
      estado: pessoa?.estado || "",
      ponto_referencia: pessoa?.ponto_referencia || "",
      descricao: pessoa?.descricao || "",
      eh_cliente: pessoa?.eh_cliente || false,
      eh_fornecedor: pessoa?.eh_fornecedor || false,
      eh_colaborador: pessoa?.eh_colaborador || false,
    },
  });

  const tipoCadastro = form.watch("tipo_cadastro");
  const cepValue = form.watch("cep");

  useEffect(() => {
    const buscarCep = async () => {
      const cepDigits = cepValue?.replace(/\D/g, '') || '';
      
      if (cepDigits.length !== 8) {
        setCepError("");
        return;
      }

      setCepError("");
      setLoadingCep(true);

      try {
        const data = await consultarCep(cepDigits);
        
        if (!data) {
          setCepError("CEP não encontrado.");
          setLoadingCep(false);
          return;
        }

        // Preencher os campos automaticamente
        form.setValue("logradouro", data.logradouro);
        form.setValue("bairro", data.bairro);
        form.setValue("municipio", data.localidade);
        form.setValue("estado", data.uf);
        setEnderecoEditavel(false);
      } catch (error) {
        setCepError("Erro ao consultar CEP.");
      } finally {
        setLoadingCep(false);
      }
    };

    if (cepValue && !enderecoEditavel) {
      buscarCep();
    }
  }, [cepValue, enderecoEditavel, form]);

  const handleCpfCnpjBlur = async () => {
    const value = form.getValues("cpf_cnpj");
    if (!value) {
      setCpfCnpjError("");
      return;
    }

    const digits = unmaskCPFCNPJ(value);
    
    if (tipoCadastro === "Pessoa Física") {
      const validation = validateCPF(value);
      if (!validation.valid) {
        setCpfCnpjError(validation.message || "CPF inválido");
        return;
      }
    } else {
      const validation = validateCNPJ(value);
      if (!validation.valid) {
        setCpfCnpjError(validation.message || "CNPJ inválido");
        return;
      }
    }

    const duplicateCheck = await validateCPFCNPJDuplicate(digits, pessoa?.id);
    if (!duplicateCheck.valid) {
      setCpfCnpjError(duplicateCheck.message || "CPF/CNPJ já cadastrado");
    } else {
      setCpfCnpjError("");
    }
  };

  const handleSubmit = async (data: PessoaFormData) => {
    if (cpfCnpjError) {
      toast.error(cpfCnpjError);
      return;
    }

    setIsSubmitting(true);

    try {
      const cpfCnpjDigits = data.cpf_cnpj ? unmaskCPFCNPJ(data.cpf_cnpj) : "";
      const telefoneDigits = data.telefone ? unmaskCPFCNPJ(data.telefone) : "";
      const cepDigits = data.cep ? unmaskCPFCNPJ(data.cep) : "";

      const pessoaData = {
        nome: data.nome,
        tipo_cadastro: data.tipo_cadastro,
        cpf_cnpj: cpfCnpjDigits || "",
        telefone: telefoneDigits || null,
        email: data.email || null,
        cep: cepDigits || null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        municipio: data.municipio || null,
        estado: data.estado || null,
        ponto_referencia: data.ponto_referencia || null,
        descricao: data.descricao || null,
        eh_cliente: data.eh_cliente,
        eh_fornecedor: data.eh_fornecedor,
        eh_colaborador: data.eh_colaborador,
      };

      if (pessoa?.id) {
        const { error } = await supabase
          .from("vx_pessoa")
          .update(pessoaData)
          .eq("id", pessoa.id);

        if (error) throw error;
        toast.success("Pessoa atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("vx_pessoa")
          .insert([pessoaData]);

        if (error) throw error;
        toast.success("Pessoa cadastrada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Erro ao salvar pessoa:", error);
      toast.error(error.message || "Erro ao salvar pessoa");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {pessoa ? "Editar Pessoa" : "Adicionar Pessoa"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Dados Básicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dados Básicos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_cadastro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cadastro</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                          <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf_cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipoCadastro === "Pessoa Física" ? "CPF" : "CNPJ"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            tipoCadastro === "Pessoa Física"
                              ? "000.000.000-00"
                              : "00.000.000/0000-00"
                          }
                          value={field.value || ""}
                          onChange={(e) => {
                            const masked = tipoCadastro === "Pessoa Física"
                              ? maskCPF(e.target.value)
                              : maskCNPJ(e.target.value);
                            field.onChange(masked);
                            setCpfCnpjError("");
                          }}
                          onBlur={handleCpfCnpjBlur}
                        />
                      </FormControl>
                      {cpfCnpjError && (
                        <p className="text-sm text-destructive">{cpfCnpjError}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          value={field.value || ""}
                          onChange={(e) => {
                            const masked = maskPhone(e.target.value);
                            field.onChange(masked);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Classificações */}
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="eh_cliente"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Cliente</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eh_fornecedor"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Fornecedor</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eh_colaborador"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Colaborador</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Endereço</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="00000-000"
                            value={field.value || ""}
                            onChange={(e) => {
                              const masked = maskCEP(e.target.value);
                              field.onChange(masked);
                              setCepError("");
                              if (masked.replace(/\D/g, '').length < 8) {
                                setEnderecoEditavel(false);
                              }
                            }}
                          />
                          {loadingCep && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-accent" />
                          )}
                        </div>
                      </FormControl>
                      {cepError && (
                        <p className="text-sm text-destructive">{cepError}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logradouro"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua, Avenida..."
                          {...field}
                          disabled={!enderecoEditavel && !!field.value && !loadingCep}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apto, Sala..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bairro"
                          {...field}
                          disabled={!enderecoEditavel && !!field.value && !loadingCep}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="municipio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Município</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Cidade"
                          {...field}
                          disabled={!enderecoEditavel && !!field.value && !loadingCep}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!enderecoEditavel && !!field.value && !loadingCep}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ESTADOS.map((estado) => (
                            <SelectItem key={estado} value={estado}>
                              {estado}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ponto_referencia"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>Ponto de Referência</FormLabel>
                      <FormControl>
                        <Input placeholder="Próximo ao..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Botão de edição manual */}
              {!enderecoEditavel && (form.watch("logradouro") || form.watch("bairro") || form.watch("municipio") || form.watch("estado")) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEnderecoEditavel(true)}
                  className="mt-2"
                >
                  Editar endereço manualmente
                </Button>
              )}
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {pessoa ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
