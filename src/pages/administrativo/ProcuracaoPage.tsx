import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { ProcuracaoDialog } from "@/features/administrativo/components/ProcuracaoDialog";

export default function ProcuracaoPage() {
  const [dialogOpen, setDialogOpen] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procuração"
        description="Geração de procuração particular para transferência de veículos"
      />
      <Button onClick={() => setDialogOpen(true)}>
        <FileText className="w-4 h-4 mr-2" />
        Nova Procuração
      </Button>
      <ProcuracaoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
