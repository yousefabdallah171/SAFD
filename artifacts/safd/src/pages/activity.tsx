import { useState } from "react";
import { useListActivityLogs, getListActivityLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { format } from "date-fns";

const typeConfig: Record<string, { label: string; color: string }> = {
  comment_received: { label: "Comment", color: "bg-blue-500/15 text-blue-400" },
  reply_sent: { label: "Reply Sent", color: "bg-green-500/15 text-green-400" },
  dm_sent: { label: "DM Sent", color: "bg-purple-500/15 text-purple-400" },
  rule_matched: { label: "Rule Match", color: "bg-yellow-500/15 text-yellow-400" },
  error: { label: "Error", color: "bg-red-500/15 text-red-400" },
};

export default function ActivityPage() {
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);

  const params = { type, page, limit: 50 };
  const { data, isLoading } = useListActivityLogs(params, { query: { queryKey: getListActivityLogsQueryKey(params) } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time feed of all automation events</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger className="w-44" data-testid="select-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="comment_received">Comments</SelectItem>
            <SelectItem value="reply_sent">Replies</SelectItem>
            <SelectItem value="dm_sent">DMs</SelectItem>
            <SelectItem value="rule_matched">Rule matches</SelectItem>
            <SelectItem value="error">Errors</SelectItem>
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{data.total} events</span>}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No activity yet</p>
          <p className="text-sm mt-1">Automation events will appear here in real time</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {data.data.map((log) => {
            const cfg = typeConfig[log.type] ?? { label: log.type, color: "bg-muted text-muted-foreground" };
            return (
              <Card key={log.id} data-testid={`activity-log-${log.id}`}>
                <CardContent className="py-3 px-5">
                  <div className="flex items-center gap-4">
                    <Badge className={`shrink-0 text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    <p className="flex-1 text-sm text-foreground truncate">{log.message}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{format(new Date(log.createdAt), "MMM d, h:mm:ss a")}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
