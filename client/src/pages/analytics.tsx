import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";

export default function Analytics() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Analytics" 
          subtitle="Track performance metrics and insights" 
        />
        
        <div className="p-8">
          <div className="text-center py-20">
            <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-slate-600 dark:text-slate-300 mb-4">
              Analytics Dashboard
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Advanced analytics and reporting features are coming soon. Track campaign performance, 
              client ROI, and business insights all in one place.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <CardTitle className="text-lg">Performance Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Monitor campaign ROI and conversion metrics
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <CardTitle className="text-lg">Client Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Analyze client behavior and engagement patterns
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <DollarSign className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <CardTitle className="text-lg">Revenue Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Track revenue growth and financial trends
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}