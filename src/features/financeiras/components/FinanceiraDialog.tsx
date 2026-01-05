import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, X, Building } from "lucide-react";

const financeiraSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  ativa: z.boolean(),
});

type FinanceiraFormData = z.infer<typeof financeiraSchema>;

interface Financeira {
  id: string;
  nome: string;
  ativa: boolean;
  logo_url: string | null;
}

interface FinanceiraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  financeira?: Financeira | null;
  onSuccess: () => void;
}

export function FinanceiraDialog({ open, onOpenChange, financeira, onSuccess }: FinanceiraDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FinanceiraFormData>({
    resolver: zodResolver(financeiraSchema),
    defaultValues: {
      nome: "",
      ativa: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nome: financeira?.nome || "",
        ativa: financeira?.ativa ?? true,
      });
      setLogoUrl(financeira?.logo_url || null);
    }
  }, [open, financeira, form]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `financeiras/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file);

      if (uploadError) {
        // Se o bucket não existir, vamos tentar criar
        if (uploadError.message.includes("bucket")) {
          toast.error("Bucket de storage não configurado. Entre em contato com o administrador.");
          return;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast.success("Logo enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
  };

  const handleSubmit = async (data: FinanceiraFormData) => {
    setIsSubmitting(true);

    try {
      const financeiraData = {
        nome: data.nome,
        ativa: data.ativa,
        logo_url: logoUrl,
      };

      if (financeira?.id) {
        const { error } = await supabase
          .from("vx_financeiras")
          .update(financeiraData)
          .eq("id", financeira.id);

        if (error) throw error;
        toast.success("Financeira atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("vx_financeiras")
          .insert([financeiraData]);

        if (error) throw error;
        toast.success("Financeira cadastrada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
      setLogoUrl(null);
    } catch (error: any) {
      console.error("Erro ao salvar financeira:", error);
      toast.error(error.message || "Erro ao salvar financeira");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {financeira ? "Editar Financeira" : "Adicionar Financeira"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-20 w-32 object-contain rounded border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-20 w-32 bg-muted rounded border border-dashed border-border flex items-center justify-center">
                    <Building className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar Logo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG até 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Nome */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da financeira" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="ativa"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativa</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Financeira disponível para uso no sistema
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent hover:bg-accent/90"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
