import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building2, Users, Bell, CreditCard, ChevronRight } from "lucide-react";

const Configuracoes = () => {
  const navigate = useNavigate();

  const configSections = [
    {
      icon: Building2,
      title: "Empresa",
      description: "Dados da empresa e informações gerais",
      path: null,
    },
    {
      icon: Users,
      title: "Usuários",
      description: "Gerenciar usuários e permissões",
      path: null,
    },
    {
      icon: CreditCard,
      title: "Formas de Pagamento",
      description: "Gerenciar formas de pagamento",
      path: "/configuracoes/formas-pagamento",
    },
    {
      icon: Bell,
      title: "Notificações",
      description: "Configurar alertas e notificações",
      path: null,
    },
    {
      icon: Settings,
      title: "Sistema",
      description: "Configurações gerais do sistema",
      path: null,
    },
  ];

  const handleClick = (path: string | null) => {
    if (path) {
      navigate(path);
    }
  };

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
            onClick={() => handleClick(section.path)}
            className={`glass border-border/50 transition-all ${
              section.path 
                ? "hover:border-accent/50 cursor-pointer" 
                : "opacity-60 cursor-not-allowed"
            }`}
          >
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <section.icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-foreground">{section.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {section.description}
                  </CardDescription>
                </div>
                {section.path && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {!section.path && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Funcionalidade em desenvolvimento
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Configuracoes;
