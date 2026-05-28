import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  MessageSquare,
  BarChart2,
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
  Share2,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Auto-Replies",
    desc: "Reply to every comment within 2 seconds, 24/7, using keyword-based rules you define.",
  },
  {
    icon: MessageSquare,
    title: "Automated DM Funnels",
    desc: "Convert engaged commenters into leads by sending personalized DMs automatically.",
  },
  {
    icon: BarChart2,
    title: "Real-Time Analytics",
    desc: "Track reply rates, DM delivery, and engagement metrics across all your posts.",
  },
  {
    icon: Shield,
    title: "Meta API Compliant",
    desc: "Built on official Meta Graph APIs only. No scraping. No account bans. Ever.",
  },
  {
    icon: Clock,
    title: "Save 5+ Hours Daily",
    desc: "Stop spending hours manually responding. Let automation handle the volume.",
  },
  {
    icon: Share2,
    title: "Facebook & Instagram",
    desc: "Manage both platforms from one dashboard with unified rule management.",
  },
];

const stats = [
  { value: "80%", label: "Time saved on manual replies" },
  { value: "100%", label: "Comment response rate" },
  { value: "2s", label: "Average reply time" },
  { value: "99.9%", label: "Platform uptime" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <Share2 className="w-6 h-6" />
            <span>SAFD</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-login">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="link-register">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-6 text-xs tracking-widest uppercase">
          Social Media Automation
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Automate your social
          <br />
          <span className="text-primary">engagement at scale</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Reply to every Facebook and Instagram comment automatically. Convert followers into customers
          with rule-based DM funnels. Works 24/7 so you don't have to.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2 text-base px-8 h-12" data-testid="button-hero-cta">
              Start automating free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-base px-8 h-12">
              Sign in to dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need to scale engagement</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built for social media managers and small business owners who want automation without the complexity.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors group">
              <f.icon className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Up and running in 5 minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { n: "01", title: "Connect Meta API", desc: "Add your Meta API credentials securely. We encrypt everything at rest." },
              { n: "02", title: "Set automation rules", desc: "Define keywords, reply text, and optional DM messages per post or globally." },
              { n: "03", title: "Watch it work", desc: "Every matching comment gets an instant reply. No more missed opportunities." },
            ].map((step) => (
              <div key={step.n} className="relative">
                <div className="text-5xl font-bold text-primary/10 mb-4">{step.n}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to automate your engagement?</h2>
        <p className="text-muted-foreground mb-8">Join hundreds of social media managers saving 5+ hours daily.</p>
        <Link href="/register">
          <Button size="lg" className="gap-2 px-10 h-12 text-base" data-testid="button-bottom-cta">
            Get started — it's free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Share2 className="w-4 h-4 text-primary" />
            SAFD
          </div>
          <div>Social Auto Funnel Dashboard &copy; 2026</div>
        </div>
      </footer>
    </div>
  );
}
