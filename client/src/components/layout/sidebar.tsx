import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  ChartPie, 
  Users, 
  Megaphone, 
  File, 
  BarChart3, 
  Settings,
  User
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartPie },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Invoices", href: "/invoices", icon: File },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-emerald-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="text-white text-lg w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Aamir Rehman</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Clients Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href === "/" && location === "/");
          return (
            <Link key={item.name} href={item.href}>
              <a className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-colors",
                isActive
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}>
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Aamir Rehman</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Digital Marketing Expert</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
