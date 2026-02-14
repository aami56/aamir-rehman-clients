import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  ChartPie, 
  Users, 
  Megaphone, 
  File, 
  BarChart3, 
  Settings,
  User,
  ListTodo,
  CreditCard,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartPie },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Invoices", href: "/invoices", icon: File },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Reconciliation", href: "/reconciliation", icon: CreditCard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    window.location.href = "/";
  };

  return (
    <aside className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-emerald-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="text-white text-lg w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Client Manager</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Business Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const isDashActive = item.href === "/" && location === "/";
          return (
            <Link key={item.name} href={item.href} className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-colors",
              (isActive || isDashActive)
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}>
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
