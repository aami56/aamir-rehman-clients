import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, User, Bell, Palette, Database, DollarSign, Download, Upload, Moon, Sun, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Client, Billing, Campaign } from "@shared/schema";

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
];

export function getCurrencyInfo() {
  const saved = localStorage.getItem("currency");
  return CURRENCIES.find(c => c.code === saved) || CURRENCIES[0];
}

interface ProfileSettings {
  fullName: string;
  email: string;
  company: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  paymentReminders: boolean;
  campaignAlerts: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem("currency") || "USD";
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [profile, setProfile] = useState<ProfileSettings>(() => {
    const saved = localStorage.getItem("profile");
    return saved ? JSON.parse(saved) : {
      fullName: "Aamir Rehman",
      email: "aamir@example.com",
      company: "Aamir Rehman Digital Marketing"
    };
  });

  const [notifications, setNotifications] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem("notifications");
    return saved ? JSON.parse(saved) : {
      emailNotifications: true,
      paymentReminders: true,
      campaignAlerts: false
    };
  });

  const [autoBackup, setAutoBackup] = useState(() => {
    return localStorage.getItem("autoBackup") === "true";
  });

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme]);

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    localStorage.setItem("currency", value);
    toast({
      title: "Currency Updated",
      description: `Currency changed to ${CURRENCIES.find(c => c.code === value)?.name}`,
    });
    window.dispatchEvent(new Event("currencyChange"));
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    localStorage.setItem("theme", value);
    toast({
      title: "Theme Updated",
      description: `Theme changed to ${value.charAt(0).toUpperCase() + value.slice(1)}`,
    });
  };

  const handleSaveProfile = () => {
    localStorage.setItem("profile", JSON.stringify(profile));
    toast({
      title: "Profile Saved",
      description: "Your profile settings have been saved successfully",
    });
  };

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
    toast({
      title: "Notification Settings Updated",
      description: `${key.replace(/([A-Z])/g, ' $1').trim()} ${value ? 'enabled' : 'disabled'}`,
    });
  };

  const handleAutoBackupChange = (value: boolean) => {
    setAutoBackup(value);
    localStorage.setItem("autoBackup", value.toString());
    toast({
      title: "Auto-backup Updated",
      description: value ? "Auto-backup enabled" : "Auto-backup disabled",
    });
  };

  const handleExportData = async () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        settings: {
          currency,
          theme,
          profile,
          notifications,
          autoBackup
        },
        clients: clients
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clients-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Your data has been exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.settings) {
          if (data.settings.currency) handleCurrencyChange(data.settings.currency);
          if (data.settings.theme) handleThemeChange(data.settings.theme);
          if (data.settings.profile) {
            setProfile(data.settings.profile);
            localStorage.setItem("profile", JSON.stringify(data.settings.profile));
          }
          if (data.settings.notifications) {
            setNotifications(data.settings.notifications);
            localStorage.setItem("notifications", JSON.stringify(data.settings.notifications));
          }
        }

        toast({
          title: "Import Successful",
          description: "Settings have been imported successfully. Note: Client data import requires manual database operations.",
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to parse the import file. Please ensure it's a valid JSON file.",
          variant: "destructive"
        });
      }
    };
    input.click();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Settings" 
          subtitle="Configure your application preferences" 
        />
        
        <div className="p-8 max-w-4xl">
          <div className="grid gap-8">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input 
                    id="company" 
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveProfile}>Save Profile</Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Receive email alerts for important events
                    </p>
                  </div>
                  <Switch 
                    id="email-notifications" 
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="payment-reminders">Payment Reminders</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Get notified about overdue payments
                    </p>
                  </div>
                  <Switch 
                    id="payment-reminders" 
                    checked={notifications.paymentReminders}
                    onCheckedChange={(checked) => handleNotificationChange("paymentReminders", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="campaign-alerts">Campaign Alerts</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Alerts for campaign performance issues
                    </p>
                  </div>
                  <Switch 
                    id="campaign-alerts" 
                    checked={notifications.campaignAlerts}
                    onCheckedChange={(checked) => handleNotificationChange("campaignAlerts", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Choose your preferred color scheme
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => handleThemeChange("light")}
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => handleThemeChange("dark")}
                    >
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => handleThemeChange("system")}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      System
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Currency Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Currency Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currency">Default Currency</Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Select your preferred currency for billing and invoices
                  </p>
                  <Select value={currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{curr.code}</span>
                            <span className="text-slate-500">({curr.symbol})</span>
                            <span className="text-sm text-slate-400">- {curr.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>Preview:</strong> {formatCurrency(25000)} will display as the amount format
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-backup</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Automatically backup your data daily
                    </p>
                  </div>
                  <Switch 
                    checked={autoBackup}
                    onCheckedChange={handleAutoBackupChange}
                  />
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Export your settings and client data as a JSON file, or import previously exported data.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" onClick={handleImportData}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </Button>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Tip:</strong> Regularly export your data to keep a backup. The export includes all your settings and client information.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
