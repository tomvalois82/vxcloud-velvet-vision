import { 
  LayoutDashboard, 
  Car, 
  Users, 
  ShoppingCart, 
  Wallet, 
  Settings,
  Package,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  FolderTree,
  ChevronDown,
  LogOut,
  CreditCard,
  TrendingUp
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface MenuItem {
  title: string;
  url?: string;
  icon: any;
  items?: { title: string; url: string; icon: any }[];
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Veículos",
    icon: Car,
    items: [
      { title: "Estoque", url: "/veiculos/estoque", icon: Package },
      { title: "Relatórios", url: "/veiculos/relatorios", icon: BarChart3 },
    ],
  },
  { title: "Pessoas", url: "/pessoas", icon: Users },
  { title: "Investidores", url: "/investidores", icon: TrendingUp },
  {
    title: "Vendas",
    icon: ShoppingCart,
    items: [
      { title: "Listagem", url: "/vendas", icon: ShoppingCart },
      { title: "Relatórios", url: "/vendas/relatorios", icon: BarChart3 },
    ],
  },
  {
    title: "Financeiro",
    icon: Wallet,
    items: [
      { title: "Painel", url: "/financeiro", icon: LayoutDashboard },
      { title: "Contas", url: "/financeiro/contas", icon: Wallet },
      { title: "Cartões", url: "/financeiro/cartoes", icon: CreditCard },
      { title: "Categorias", url: "/financeiro/categorias", icon: FolderTree },
      { title: "A Pagar", url: "/financeiro/pagar", icon: ArrowDownCircle },
      { title: "A Receber", url: "/financeiro/receber", icon: ArrowUpCircle },
      { title: "Transferências", url: "/financeiro/transferencias", icon: ArrowLeftRight },
      { title: "Margem", url: "/financeiro/margem", icon: BarChart3 },
      { title: "Relatórios", url: "/financeiro/relatorios", icon: BarChart3 },
    ],
  },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();

  const isItemActive = (item: MenuItem) => {
    if (item.url) {
      return location.pathname === item.url;
    }
    if (item.items) {
      return item.items.some(subItem => location.pathname === subItem.url);
    }
    return false;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <div className="px-4 py-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-sm">VX</span>
              </div>
              {open && (
                <span className="font-bold text-lg text-sidebar-foreground">
                  VX Cloud
                </span>
              )}
            </div>
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible defaultOpen={isItemActive(item)} className="group/collapsible">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.url}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={subItem.url}
                                  className="flex items-center gap-3 transition-all hover:text-accent"
                                  activeClassName="text-accent font-medium"
                                >
                                  <subItem.icon className="w-4 h-4" />
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url!}
                        end={item.url === "/"}
                        className="flex items-center gap-3 transition-all hover:text-accent"
                        activeClassName="text-accent font-medium"
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:text-accent hover:bg-sidebar-accent"
          >
            <LogOut className="w-5 h-5 mr-2" />
            {open && <span>Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
