import { useState } from "react";
import { useListComments, getListCommentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, User } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  replied: "bg-green-500/15 text-green-400",
  dm_sent: "bg-purple-500/15 text-purple-400",
  failed: "bg-red-500/15 text-red-400",
};

export default function Comments() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const params = { status, page, limit: 20 };
  const { data, isLoading } = useListComments(params, { query: { queryKey: getListCommentsQueryKey(params) } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comments</h1>
        <p className="text-sm text-muted-foreground mt-1">All comments received across your posts</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44" data-testid="select-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="dm_sent">DM sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{data.total} total</span>}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No comments yet</p>
          <p className="text-sm mt-1">Comments will appear here when people engage with your posts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map((comment) => (
            <Card key={comment.id} data-testid={`card-comment-${comment.id}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{comment.authorName}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(comment.receivedAt), "MMM d, h:mm a")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.text}</p>
                      {comment.repliedAt && (
                        <p className="text-xs text-green-400 mt-1">Replied {format(new Date(comment.repliedAt), "h:mm a")}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={`shrink-0 text-xs ${statusColors[comment.status] ?? ""}`}>{comment.status.replace("_", " ")}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
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
