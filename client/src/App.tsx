import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Campaigns from "@/pages/campaigns";
import Invoices from "@/pages/invoices";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import ClientDetail from "@/pages/client-detail";
import PublicInvoice from "@/pages/public-invoice";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/client/:id" component={ClientDetail} />
      <Route path="/invoice/:clientId/:month/:year" component={PublicInvoice} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="aamir-clients-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
