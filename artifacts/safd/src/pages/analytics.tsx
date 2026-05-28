import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey, useGetEngagementMetrics, getGetEngagementMetricsQueryKey, useGetTopPosts, getGetTopPostsQueryKey, useGetRulePerformance, getGetRulePerformanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { TrendingUp, MessageSquare, Send, Mail, Zap, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";

export default function Analytics() {
  const { data: summary, isLoading: sumLoading } = useGetAnalyticsSummary({ query: { queryKey: getGetAnalyticsSummaryQueryKey() } });
  const { data: engagement, isLoading: engLoading } = useGetEngagementMetrics({ params: { days: 30 } }, { query: { queryKey: getGetEngagementMetricsQueryKey({ days: 30 }) } });
  const { data: topPosts } = useGetTopPosts({ params: { limit: 5 } }, { query: { queryKey: getGetTopPostsQueryKey({ limit: 5 }) } });
  const { data: rulePerf } = useGetRulePerformance({ query: { queryKey: getGetRulePerformanceQueryKey() } });

  const chartData = (engagement ?? []).map((e) => ({
    date: format(parseISO(e.date as unknown as string), "MMM d"),
    Comments: e.comments,
    Replies: e.replies,
    DMs: e.dms,
    Errors: e.errors,
  }));

  const kpiCards = [
    { label: "Total Comments", value: summary?.totalComments ?? 0, icon: MessageSquare },
    { label: "Total Replies", value: summary?.totalReplies ?? 0, icon: Send },
    { label: "Total DMs", value: summary?.totalDms ?? 0, icon: Mail },
    { label: "Reply Rate", value: `${summary?.replyRate ?? 0}%`, icon: TrendingUp },
    { label: "DM Rate", value: `${summary?.dmDeliveryRate ?? 0}%`, icon: TrendingUp },
    { label: "Avg Response", value: `${summary?.avgResponseTimeSeconds ?? 0}s`, icon: Clock },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Deep dive into your automation performance</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-5">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{kpi.label}</div>
              {sumLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                <div className="text-3xl font-bold">{kpi.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Engagement over 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {engLoading ? <Skeleton className="h-60 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Comments" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Replies" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="DMs" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Errors" stroke="hsl(var(--chart-5))" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {!topPosts || topPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No posts data yet</p>
            ) : topPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between py-3 border-b border-border last:border-0" data-testid={`top-post-${post.id}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {post.platform === "facebook" ? <SiFacebook className="w-4 h-4 text-blue-500 shrink-0" /> : <SiInstagram className="w-4 h-4 text-pink-500 shrink-0" />}
                  <span className="text-sm truncate">{post.caption ?? "(No caption)"}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground shrink-0 ml-3">
                  <span>{post.commentCount} comments</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Rule Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" /> Rule Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!rulePerf || rulePerf.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No rule data yet</p>
            ) : rulePerf.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between py-3 border-b border-border last:border-0" data-testid={`rule-perf-${rule.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{rule.name}</span>
                    {rule.isGlobal && <Badge variant="outline" className="text-xs">global</Badge>}
                    {!rule.isEnabled && <Badge variant="secondary" className="text-xs">paused</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{rule.matchCount} matches · {rule.replyCount} replies</div>
                </div>
                <div className="text-sm font-semibold text-primary shrink-0 ml-3">{rule.successRate}%</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
