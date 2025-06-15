import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, User, Bell, Palette, Database } from "lucide-react";

export default function Settings() {
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
                    <Input id="name" defaultValue="Aamir Rehman" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="aamir@example.com" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" defaultValue="Aamir Rehman Digital Marketing" />
                </div>
                <Button>Save Profile</Button>
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
                  <Switch id="email-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="payment-reminders">Payment Reminders</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Get notified about overdue payments
                    </p>
                  </div>
                  <Switch id="payment-reminders" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="campaign-alerts">Campaign Alerts</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Alerts for campaign performance issues
                    </p>
                  </div>
                  <Switch id="campaign-alerts" />
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
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select defaultValue="USD">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="PKR">PKR (₨)</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Switch defaultChecked />
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" className="mr-2">
                    Export Data
                  </Button>
                  <Button variant="outline">
                    Import Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Coming Soon Features */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Coming Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Additional settings features are in development
                  </p>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• API integrations</li>
                    <li>• Advanced reporting preferences</li>
                    <li>• Team management</li>
                    <li>• Custom branding options</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}