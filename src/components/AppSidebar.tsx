import { LayoutDashboard, Car, Users, ShoppingCart, Wallet, Settings, Package, BarChart3, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, FolderTree, ChevronDown, LogOut, CreditCard, TrendingUp, FileText, Moon, Sun, Building2, ClipboardList, Printer, BookOpen, List } from "lucide-react";
import { useTheme } from "next-themes";
import logo from "@/assets/logo-completa-transparente.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperUser } from "@/hooks/useSuperUser";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
interface SubSubMenuItem {
  title: string;
  url: string;
  icon: any;
}

interface SubMenuItem {
  title: string;
  url?: string;
  icon: any;
  items?: SubSubMenuItem[];
}

interface MenuItem {
  title: string;
  url?: string;
  icon: any;
  items?: SubMenuItem[];
}
const menuItems: MenuItem[] = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard
}, {
  title: "Veículos",
  icon: Car,
  items: [{
    title: "Estoque",
    url: "/veiculos/estoque",
    icon: Package
  }, {
    title: "Relatórios",
    url: "/veiculos/relatorios",
    icon: BarChart3
  }]
}, {
  title: "Pessoas",
  url: "/pessoas",
  icon: Users
}, {
  title: "Financeiras",
  url: "/financeiras",
  icon: Building2
}, {
  title: "Investidores",
  icon: TrendingUp,
  items: [{
    title: "Investimentos",
    url: "/investidores",
    icon: TrendingUp
  }, {
    title: "Carteiras",
    url: "/investidores/carteiras",
    icon: Wallet
  }]
}, {
  title: "Vendas",
  icon: ShoppingCart,
  items: [{
    title: "Listagem",
    url: "/vendas",
    icon: ShoppingCart
  }, {
    title: "Relatórios",
    url: "/vendas/relatorios",
    icon: BarChart3
  }]
}, {
  title: "Financeiro",
  icon: Wallet,
  items: [{
    title: "Painel",
    url: "/financeiro",
    icon: LayoutDashboard
  }, {
    title: "Contas",
    url: "/financeiro/contas",
    icon: Wallet
  }, {
    title: "Cartões",
    url: "/financeiro/cartoes",
    icon: CreditCard
  }, {
    title: "Categorias",
    url: "/financeiro/categorias",
    icon: FolderTree
  }, {
    title: "A Pagar",
    url: "/financeiro/pagar",
    icon: ArrowDownCircle
  }, {
    title: "A Receber",
    url: "/financeiro/receber",
    icon: ArrowUpCircle
  }, {
    title: "Transferências",
    url: "/financeiro/transferencias",
    icon: ArrowLeftRight
  }, {
    title: "Relatórios",
    icon: BarChart3,
    items: [{
      title: "DRE",
      url: "/financeiro/dre",
      icon: FileText
    }, {
      title: "Margem",
      url: "/financeiro/margem",
      icon: BarChart3
    }, {
      title: "Financeiro de Estoque",
      url: "/financeiro/relatorios",
      icon: Package
    }]
  }]
}, {
  title: "Contabilidade",
  icon: BookOpen,
  items: [{
    title: "Plano de Contas",
    url: "/contabilidade/plano",
    icon: List
  }]
}, {
  title: "Administrativo",
  icon: ClipboardList,
  items: [{
    title: "Impressos",
    icon: Printer,
    items: [{
      title: "Procuração",
      url: "/administrativo/procuracao",
      icon: FileText
    }]
  }]
}, {
  title: "Configurações",
  url: "/configuracoes",
  icon: Settings
}];
const superUserMenuItems: MenuItem[] = [{
  title: "Empresas",
  url: "/configuracoes/empresas",
  icon: Building2
}];
export function AppSidebar() {
  const {
    open
  } = useSidebar();
  const location = useLocation();
  const {
    signOut
  } = useAuth();
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    isSuperUser
  } = useSuperUser();
  const { hasAccess } = useAccessControl();

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.reduce<MenuItem[]>((acc, item) => {
      if (item.url && !hasAccess(item.url)) return acc;
      if (item.items) {
        const filteredSubs = item.items.reduce<SubMenuItem[]>((subAcc, sub) => {
          if (sub.url && !hasAccess(sub.url)) return subAcc;
          if (sub.items) {
            const filteredNested = sub.items.filter(n => hasAccess(n.url));
            if (filteredNested.length === 0) return subAcc;
            subAcc.push({ ...sub, items: filteredNested });
          } else {
            subAcc.push(sub);
          }
          return subAcc;
        }, []);
        if (filteredSubs.length === 0) return acc;
        acc.push({ ...item, items: filteredSubs });
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
  };

  const filteredMenuItems = filterMenuItems(menuItems);
  const isItemActive = (item: MenuItem) => {
    if (item.url) {
      return location.pathname === item.url;
    }
    if (item.items) {
      return item.items.some(subItem => {
        if (subItem.url && location.pathname === subItem.url) return true;
        if (subItem.items) {
          return subItem.items.some(nestedItem => location.pathname === nestedItem.url);
        }
        return false;
      });
    }
    return false;
  };
  return <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <div className="px-4 py-6">
            <div className="flex items-center">
              <img src={logo} alt="VX Cloud" className={open ? "h-10 w-auto" : "h-8 w-8 object-contain object-left"} />
            </div>
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map(item => <SidebarMenuItem key={item.title}>
                  {item.items ? <Collapsible defaultOpen={isItemActive(item)} className="group/collapsible">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map(subItem => 
                            subItem.items ? (
                              <SidebarMenuSubItem key={subItem.title}>
                                <Collapsible className="group/nested">
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton className="cursor-pointer">
                                      <subItem.icon className="w-4 h-4 text-primary-foreground border-white" />
                                      <span className="text-[#e3e3e3]">{subItem.title}</span>
                                      <ChevronDown className="ml-auto w-3 h-3 transition-transform group-data-[state=open]/nested:rotate-180" />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub className="ml-4">
                                      {subItem.items.map(nestedItem => (
                                        <SidebarMenuSubItem key={nestedItem.url}>
                                          <SidebarMenuSubButton asChild>
                                            <NavLink to={nestedItem.url} className="flex items-center gap-3 transition-all hover:text-accent" activeClassName="text-accent font-medium">
                                              <nestedItem.icon className="w-4 h-4 text-primary-foreground border-white" />
                                              <span className="text-[#e3e3e3]">{nestedItem.title}</span>
                                            </NavLink>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      ))}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </Collapsible>
                              </SidebarMenuSubItem>
                            ) : (
                              <SidebarMenuSubItem key={subItem.url}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink to={subItem.url!} className="flex items-center gap-3 transition-all hover:text-accent" activeClassName="text-accent font-medium">
                                    <subItem.icon className="w-4 h-4 text-primary-foreground border-white" />
                                    <span className="text-[#e3e3e3]">{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible> : <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink to={item.url!} end={item.url === "/"} className="flex items-center gap-3 transition-all hover:text-accent" activeClassName="text-accent font-medium">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>}
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Super User Menu */}
        {isSuperUser && <SidebarGroup>
            <SidebarGroupLabel>Super Usuário</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superUserMenuItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink to={item.url!} className="flex items-center gap-3 transition-all hover:text-accent" activeClassName="text-accent font-medium">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {/* Theme Toggle & Logout */}
        <div className="mt-auto p-4 border-t border-sidebar-border space-y-2">
          <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-accent hover:bg-sidebar-accent">
            {theme === "dark" ? <Sun className="w-5 h-5 mr-2" /> : <Moon className="w-5 h-5 mr-2" />}
            {open && <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>}
          </Button>
          <Button onClick={signOut} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-accent hover:bg-sidebar-accent">
            <LogOut className="w-5 h-5 mr-2" />
            {open && <span>Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>;
}