import { useState } from "react";
import { Link } from "wouter";
import { useListPosts, getListPostsQueryKey, useSyncPosts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { MessageSquare, RefreshCw, ImagePlay, Search, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Posts() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = { search: search || undefined, type, platform, page, limit: 20 };
  const { data, isLoading } = useListPosts(params, { query: { queryKey: getListPostsQueryKey(params) } });
  const syncMutation = useSyncPosts();

  const handleSync = async () => {
    await syncMutation.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
    toast({ title: "Sync triggered", description: "Posts will refresh shortly" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Posts & Reels</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage automation across your content</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending} className="gap-2" data-testid="button-sync">
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sync posts
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={platform} onValueChange={(v) => { setPlatform(v); setPage(1); }}>
          <SelectTrigger className="w-36" data-testid="select-platform">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger className="w-32" data-testid="select-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="post">Posts</SelectItem>
            <SelectItem value="reel">Reels</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ImagePlay className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No posts yet</p>
          <p className="text-sm mt-1">Connect your Meta API and sync your posts to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`card-post-${post.id}`}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    {post.thumbnailUrl ? (
                      <img src={post.thumbnailUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <ImagePlay className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.platform === "facebook" ? <SiFacebook className="w-3.5 h-3.5 text-blue-500" /> : <SiInstagram className="w-3.5 h-3.5 text-pink-500" />}
                        <Badge variant="outline" className="text-xs">{post.type}</Badge>
                        {post.automationEnabled && <Badge className="text-xs bg-green-500/15 text-green-400">automation on</Badge>}
                      </div>
                      <p className="text-sm text-foreground truncate">{post.caption ?? "(No caption)"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(post.publishedAt), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1.5" data-testid={`post-comments-${post.id}`}><MessageSquare className="w-3.5 h-3.5" />{post.commentCount}</span>
                      <span className="flex items-center gap-1.5" data-testid={`post-rules-${post.id}`}><Zap className="w-3.5 h-3.5" />{post.rulesCount} rules</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
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
