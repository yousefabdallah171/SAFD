import { useState } from "react";
import { Link } from "wouter";
import { useListRules, getListRulesQueryKey, useDeleteRule, useToggleRule } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Zap, Globe, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Rules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "global" | "post">("all");

  const params = filter === "global" ? { isGlobal: true } : filter === "post" ? { isGlobal: false } : {};
  const { data: rules, isLoading } = useListRules(params, { query: { queryKey: getListRulesQueryKey(params) } });
  const deleteMutation = useDeleteRule();
  const toggleMutation = useToggleRule();

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this rule?")) return;
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
    toast({ title: "Rule deleted" });
  };

  const handleToggle = async (id: number, current: boolean) => {
    await toggleMutation.mutateAsync({ id, data: { isEnabled: !current } });
    queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">Define keyword triggers and automated responses</p>
        </div>
        <Link href="/rules/new">
          <Button size="sm" className="gap-2" data-testid="button-new-rule">
            <Plus className="w-4 h-4" /> New rule
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "global", "post"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
            {f === "global" ? "Global rules" : f === "post" ? "Per-post rules" : "All rules"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !rules || rules.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No rules yet</p>
          <p className="text-sm mt-1">Create your first automation rule to start auto-replying</p>
          <Link href="/rules/new">
            <Button size="sm" className="mt-4 gap-2" data-testid="button-create-first-rule">
              <Plus className="w-4 h-4" /> Create rule
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="hover:border-border/80 transition-colors" data-testid={`card-rule-${rule.id}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {rule.isGlobal ? (
                        <Badge className="bg-blue-500/15 text-blue-400 gap-1 text-xs"><Globe className="w-3 h-3" />Global</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Per-post</Badge>
                      )}
                      <span className="font-semibold text-sm text-foreground">{rule.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {rule.keywords.map((kw) => (
                        <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">Reply: "{rule.replyText}"</p>
                    {rule.sendDm && rule.dmMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">DM: "{rule.dmMessage}"</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{rule.matchCount} matches</span>
                      <span>{rule.replyCount} replies</span>
                      {rule.sendDm && <span>{rule.dmCount} DMs</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={rule.isEnabled}
                      onCheckedChange={() => handleToggle(rule.id, rule.isEnabled)}
                      data-testid={`toggle-rule-${rule.id}`}
                    />
                    <Link href={`/rules/${rule.id}/edit`}>
                      <Button size="icon" variant="ghost" className="w-8 h-8" data-testid={`button-edit-rule-${rule.id}`}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(rule.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-rule-${rule.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
