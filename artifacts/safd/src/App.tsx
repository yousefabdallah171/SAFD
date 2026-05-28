import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuthStore } from "@/hooks/use-auth";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Posts from "@/pages/posts";
import PostDetail from "@/pages/post-detail";
import Rules from "@/pages/rules";
import RuleForm from "@/pages/rule-form";
import Comments from "@/pages/comments";
import ActivityPage from "@/pages/activity";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (token) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicOnly><Landing /></PublicOnly>
      </Route>
      <Route path="/login">
        <PublicOnly><Login /></PublicOnly>
      </Route>
      <Route path="/register">
        <PublicOnly><Register /></PublicOnly>
      </Route>

      <Route path="/onboarding">
        <ProtectedRoute><Onboarding /></ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/posts">
        <ProtectedRoute><Posts /></ProtectedRoute>
      </Route>
      <Route path="/posts/:id">
        {(params) => (
          <ProtectedRoute>
            <PostDetail id={parseInt(params.id)} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/rules">
        <ProtectedRoute><Rules /></ProtectedRoute>
      </Route>
      <Route path="/rules/new">
        <ProtectedRoute><RuleForm /></ProtectedRoute>
      </Route>
      <Route path="/rules/:id/edit">
        {(params) => (
          <ProtectedRoute>
            <RuleForm id={parseInt(params.id)} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/comments">
        <ProtectedRoute><Comments /></ProtectedRoute>
      </Route>
      <Route path="/activity">
        <ProtectedRoute><ActivityPage /></ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute><Analytics /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><Settings /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
