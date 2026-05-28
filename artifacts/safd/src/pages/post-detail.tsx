import { Link } from "wouter";
import { useGetPost, getGetPostQueryKey, useListRules, getListRulesQueryKey, useListComments, getListCommentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { MessageSquare, Zap, ArrowLeft, Plus, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function PostDetail({ id }: { id: number }) {
  const { data: post, isLoading: postLoading } = useGetPost(id, { query: { enabled: !!id, queryKey: getGetPostQueryKey(id) } });
  const { data: rules } = useListRules({ postId: id }, { query: { queryKey: getListRulesQueryKey({ postId: id }) } });
  const { data: comments } = useListComments({ postId: id, limit: 10 }, { query: { queryKey: getListCommentsQueryKey({ postId: id, limit: 10 }) } });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400",
    replied: "bg-green-500/15 text-green-400",
    dm_sent: "bg-purple-500/15 text-purple-400",
    failed: "bg-red-500/15 text-red-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/posts">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
      </div>

      {postLoading ? <Skeleton className="h-32 w-full rounded-xl" /> : !post ? (
        <div className="text-center py-20 text-muted-foreground">Post not found</div>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-5">
              {post.thumbnailUrl ? (
                <img src={post.thumbnailUrl} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {post.platform === "facebook" ? <SiFacebook className="w-4 h-4 text-blue-500" /> : <SiInstagram className="w-4 h-4 text-pink-500" />}
                  <Badge variant="outline" className="text-xs capitalize">{post.platform}</Badge>
                  <Badge variant="outline" className="text-xs">{post.type}</Badge>
                </div>
                <p className="text-sm text-foreground mb-2 line-clamp-3">{post.caption ?? "(No caption)"}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.commentCount} comments</span>
                  <span>{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
                  {post.permalink && (
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" /> View post
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-2"><Zap className="w-4 h-4" />Automation Rules</span>
            </CardTitle>
            <Link href={`/rules/new`}>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" data-testid="button-add-rule">
                <Plus className="w-3 h-3" /> Add rule
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!rules || rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No rules for this post yet</p>
          ) : rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between py-3 border-b border-border last:border-0" data-testid={`rule-item-${rule.id}`}>
              <div>
                <div className="text-sm font-medium text-foreground">{rule.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Keywords: {rule.keywords.join(", ")}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={rule.isEnabled ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}>
                  {rule.isEnabled ? "active" : "paused"}
                </Badge>
                <Link href={`/rules/${rule.id}/edit`}>
                  <Button size="sm" variant="ghost" className="h-7 text-xs">Edit</Button>
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Comments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Recent Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!comments || comments.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No comments yet</p>
          ) : comments.data.map((comment) => (
            <div key={comment.id} className="flex items-start justify-between py-3 border-b border-border last:border-0" data-testid={`comment-item-${comment.id}`}>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{comment.authorName}</div>
                <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{comment.text}</div>
              </div>
              <Badge className={`ml-3 shrink-0 text-xs ${statusColors[comment.status] ?? ""}`}>{comment.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
