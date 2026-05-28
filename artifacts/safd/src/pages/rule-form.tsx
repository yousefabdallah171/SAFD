import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateRule, useUpdateRule, useGetRule, getGetRuleQueryKey, getListRulesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  replyText: z.string().min(1, "Reply text is required"),
  dmMessage: z.string().optional(),
  sendDm: z.boolean().default(false),
  isGlobal: z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

export default function RuleForm({ id }: { id?: number }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const isEditing = !!id;

  const { data: existing } = useGetRule(id!, { query: { enabled: isEditing, queryKey: getGetRuleQueryKey(id!) } });
  const createMutation = useCreateRule();
  const updateMutation = useUpdateRule();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", replyText: "", dmMessage: "", sendDm: false, isGlobal: false },
  });

  useEffect(() => {
    if (existing && isEditing) {
      form.reset({
        name: existing.name,
        replyText: existing.replyText,
        dmMessage: existing.dmMessage ?? "",
        sendDm: existing.sendDm,
        isGlobal: existing.isGlobal,
      });
      setKeywords(existing.keywords);
    }
  }, [existing, isEditing]);

  const addKeyword = () => {
    const kw = kwInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setKwInput("");
    }
  };

  const removeKeyword = (kw: string) => setKeywords(keywords.filter(k => k !== kw));

  async function onSubmit(data: FormData) {
    if (keywords.length === 0) {
      toast({ title: "Add at least one keyword", variant: "destructive" });
      return;
    }
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: id!, data: { ...data, keywords } });
        toast({ title: "Rule updated" });
      } else {
        await createMutation.mutateAsync({ data: { ...data, keywords, isGlobal: data.isGlobal } });
        toast({ title: "Rule created" });
      }
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
      setLocation("/rules");
    } catch {
      toast({ title: "Failed to save rule", variant: "destructive" });
    }
  }

  const sendDm = form.watch("sendDm");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/rules">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to rules
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{isEditing ? "Edit rule" : "New automation rule"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEditing ? "Update your automation rule" : "Define keywords and automated responses"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Rule configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Product inquiry reply" data-testid="input-rule-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Keywords */}
              <div className="space-y-2">
                <FormLabel>Keywords</FormLabel>
                <FormDescription className="text-xs">Comments containing any of these keywords will trigger this rule</FormDescription>
                <div className="flex gap-2">
                  <Input
                    value={kwInput}
                    onChange={e => setKwInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                    placeholder="Type a keyword and press Enter"
                    data-testid="input-keyword"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addKeyword} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {keywords.map(kw => (
                      <Badge key={kw} variant="secondary" className="gap-1.5 pr-1">
                        {kw}
                        <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="replyText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto-reply comment</FormLabel>
                    <FormDescription className="text-xs">This text will be posted as a reply comment</FormDescription>
                    <FormControl>
                      <Textarea placeholder="Thanks for your comment! DM us for more info." rows={3} data-testid="textarea-reply" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sendDm"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <FormLabel>Send DM</FormLabel>
                      <FormDescription className="text-xs">Also send a direct message to the commenter</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-send-dm" />
                    </FormControl>
                  </FormItem>
                )}
              />

              {sendDm && (
                <FormField
                  control={form.control}
                  name="dmMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DM message</FormLabel>
                      <FormDescription className="text-xs">This message will be sent as a direct message</FormDescription>
                      <FormControl>
                        <Textarea placeholder="Hey! Thanks for engaging. Here's a special offer just for you..." rows={3} data-testid="textarea-dm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isGlobal"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <FormLabel>Global rule</FormLabel>
                      <FormDescription className="text-xs">Apply to all posts and reels (not just one specific post)</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-global" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-rule">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEditing ? "Update rule" : "Create rule"}
                </Button>
                <Link href="/rules">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
