import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building2, Users, Bell } from "lucide-react";

const Configuracoes = () => {
  const configSections = [
    {
      icon: Building2,
      title: "Empresa",
      description: "Dados da empresa e informações gerais",
    },
    {
      icon: Users,
      title: "Usuários",
      description: "Gerenciar usuários e permissões",
    },
    {
      icon: Bell,
      title: "Notificações",
      description: "Configurar alertas e notificações",
    },
    {
      icon: Settings,
      title: "Sistema",
      description: "Configurações gerais do sistema",
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações do sistema"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configSections.map((section) => (
          <Card
            key={section.title}
            className="glass border-border/50 hover:border-accent/50 transition-all cursor-pointer"
          >
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <section.icon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-foreground">{section.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {section.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Funcionalidade em desenvolvimento
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Configuracoes;
