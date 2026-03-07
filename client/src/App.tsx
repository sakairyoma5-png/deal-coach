import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import SkillsPage from "@/pages/skills";
import RoleplayPage from "@/pages/roleplay";
import DiagnosisPage from "@/pages/diagnosis";
import PricingPage from "@/pages/pricing";
import CalendarPage from "@/pages/calendar";
import ProfilePage from "@/pages/profile";
import OrganizationPage from "@/pages/organization";
import OrgSettingsPage from "@/pages/org-settings";
import OrgDashboard from "@/pages/org-dashboard";
import LegalPage from "@/pages/legal";
import TermsPage from "@/pages/terms";
import TosConsentPage from "@/pages/tos-consent";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/skills" component={SkillsPage} />
      <Route path="/roleplay" component={RoleplayPage} />
      <Route path="/diagnosis" component={DiagnosisPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/org" component={OrganizationPage} />
      <Route path="/org/:id/settings" component={OrgSettingsPage} />
      <Route path="/org/:id/dashboard" component={OrgDashboard} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/terms" component={TermsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/pricing" component={PricingPage} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/terms" component={TermsPage} />
      <Route component={LandingPage} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm px-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <UnauthenticatedRoutes />;
  }

  if (!user.tosAccepted) {
    return (
      <Switch>
        <Route path="/terms" component={TermsPage} />
        <Route path="/legal" component={LegalPage} />
        <Route component={TosConsentPage} />
      </Switch>
    );
  }

  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
