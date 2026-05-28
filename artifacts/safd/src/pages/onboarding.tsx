import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Share2, Key, RefreshCw, Zap, BarChart2 } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

const steps = [
  { id: 1, title: "Welcome to SAFD", icon: Share2, desc: "Your social engagement automation dashboard is ready to set up." },
  { id: 2, title: "Connect Meta API", icon: Key, desc: "Add your Facebook or Instagram API credentials in Settings to enable automation." },
  { id: 3, title: "Sync your posts", icon: RefreshCw, desc: "Fetch all your posts and reels from Meta so you can set up rules for them." },
  { id: 4, title: "Create your first rule", icon: Zap, desc: "Define keywords and auto-reply text to respond to comments automatically." },
  { id: 5, title: "You're all set!", icon: BarChart2, desc: "Watch your engagement metrics grow in the analytics dashboard." },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState(1);
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const step = steps[current - 1];
  const isLast = current === steps.length;

  const handleNext = () => {
    if (isLast) {
      setLocation("/dashboard");
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleActionClick = () => {
    if (current === 2) setLocation("/settings");
    else if (current === 4) setLocation("/rules/new");
    else handleNext();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary font-bold text-2xl mb-4">
            <Share2 className="w-7 h-7" />
            <span>SAFD</span>
          </div>
          {user && <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s) => (
            <div key={s.id} className={`h-1.5 rounded-full transition-all ${s.id === current ? "w-8 bg-primary" : s.id < current ? "w-4 bg-primary/40" : "w-4 bg-muted"}`} />
          ))}
        </div>

        <Card>
          <CardContent className="py-10 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <step.icon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3">{step.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">{step.desc}</p>

            <div className="flex flex-col gap-3">
              {(current === 2 || current === 4) && (
                <Button onClick={handleActionClick} className="gap-2" data-testid="button-step-action">
                  {current === 2 ? "Go to Settings" : "Create a rule"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant={current === 2 || current === 4 ? "outline" : "default"}
                onClick={handleNext}
                className="gap-2"
                data-testid="button-step-next"
              >
                {isLast ? (
                  <><CheckCircle2 className="w-4 h-4" />Go to Dashboard</>
                ) : (
                  <>{current === 2 || current === 4 ? "Skip for now" : "Continue"}<ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">Step {current} of {steps.length}</p>
      </div>
    </div>
  );
}
