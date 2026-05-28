import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey, useGetEngagementMetrics, getGetEngagementMetricsQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useGetTopPosts, getGetTopPostsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Mail, TrendingUp, Zap, Clock, Share2 } from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";

function StatCard({ title, value, sub, icon: Icon, loading }: { title: string; value: string | number; sub?: string; icon: React.ElementType; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{title}</div>
            {loading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <div className="text-3xl font-bold text-foreground">{value}</div>
            )}
            {sub && !loading && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetAnalyticsSummary({ query: { queryKey: getGetAnalyticsSummaryQueryKey() } });
  const { data: engagement, isLoading: engLoading } = useGetEngagementMetrics({ params: { days: 30 } }, { query: { queryKey: getGetEngagementMetricsQueryKey({ days: 30 }) } });
  const { data: recentActivity } = useGetRecentActivity({ params: { limit: 8 } }, { query: { queryKey: getGetRecentActivityQueryKey({ limit: 8 }) } });
  const { data: topPosts } = useGetTopPosts({ params: { limit: 5 } }, { query: { queryKey: getGetTopPostsQueryKey({ limit: 5 }) } });

  const chartData = (engagement ?? []).map((e) => ({
    date: format(parseISO(e.date as unknown as string), "MMM d"),
    Comments: e.comments,
    Replies: e.replies,
    DMs: e.dms,
  }));

  const activityTypeLabels: Record<string, { label: string; color: string }> = {
    comment_received: { label: "Comment", color: "bg-blue-500/20 text-blue-400" },
    reply_sent: { label: "Reply Sent", color: "bg-green-500/20 text-green-400" },
    dm_sent: { label: "DM Sent", color: "bg-purple-500/20 text-purple-400" },
    rule_matched: { label: "Rule Matched", color: "bg-yellow-500/20 text-yellow-400" },
    error: { label: "Error", color: "bg-red-500/20 text-red-400" },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your automation overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Comments" value={summary?.totalComments ?? 0} icon={MessageSquare} loading={summaryLoading} />
        <StatCard title="Replies Sent" value={summary?.totalReplies ?? 0} icon={Send} loading={summaryLoading} />
        <StatCard title="DMs Sent" value={summary?.totalDms ?? 0} icon={Mail} loading={summaryLoading} />
        <StatCard title="Reply Rate" value={`${summary?.replyRate ?? 0}%`} icon={TrendingUp} loading={summaryLoading} />
        <StatCard title="Active Rules" value={summary?.activeRules ?? 0} icon={Zap} loading={summaryLoading} />
        <StatCard title="Avg Response" value={`${summary?.avgResponseTimeSeconds ?? 0}s`} icon={Clock} loading={summaryLoading} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Engagement Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Engagement (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {engLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Comments" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Replies" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="DMs" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!recentActivity || recentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No activity yet</div>
            ) : recentActivity.map((log) => {
              const meta = activityTypeLabels[log.type] ?? { label: log.type, color: "bg-muted text-muted-foreground" };
              return (
                <div key={log.id} className="flex items-start gap-3" data-testid={`activity-item-${log.id}`}>
                  <Badge className={`text-xs shrink-0 ${meta.color}`}>{meta.label}</Badge>
                  <div className="text-xs text-muted-foreground line-clamp-2">{log.message}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top Posts */}
      {topPosts && topPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Posts by Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-4 py-2 border-b border-border last:border-0" data-testid={`top-post-${post.id}`}>
                  <div className="flex items-center gap-2 shrink-0">
                    {post.platform === "facebook" ? <SiFacebook className="w-4 h-4 text-blue-500" /> : <SiInstagram className="w-4 h-4 text-pink-500" />}
                    <Badge variant="outline" className="text-xs">{post.type}</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{post.caption ?? "(No caption)"}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
                    <span data-testid={`post-comments-${post.id}`}>{post.commentCount} comments</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
