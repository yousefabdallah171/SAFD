import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetMe, getGetMeQueryKey, useGetMetaCredentials, getGetMetaCredentialsQueryKey, useCreateMetaCredential, useDeleteMetaCredential } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { Plus, Trash2, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const credSchema = z.object({
  appId: z.string().min(1, "App ID is required"),
  appSecret: z.string().min(1, "App Secret is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  platform: z.enum(["facebook", "instagram", "both"]),
});
type CredForm = z.infer<typeof credSchema>;

function statusIcon(status: string) {
  if (status === "active") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  return <AlertCircle className="w-4 h-4 text-red-400" />;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddCred, setShowAddCred] = useState(false);

  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: creds, isLoading: credsLoading } = useGetMetaCredentials({ query: { queryKey: getGetMetaCredentialsQueryKey() } });
  const createCredMutation = useCreateMetaCredential();
  const deleteCredMutation = useDeleteMetaCredential();

  const credForm = useForm<CredForm>({
    resolver: zodResolver(credSchema),
    defaultValues: { appId: "", appSecret: "", accessToken: "", platform: "both" },
  });

  const handleAddCred = async (data: CredForm) => {
    try {
      await createCredMutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getGetMetaCredentialsQueryKey() });
      toast({ title: "Meta API connected" });
      credForm.reset();
      setShowAddCred(false);
    } catch {
      toast({ title: "Failed to connect", description: "Check your credentials and try again", variant: "destructive" });
    }
  };

  const handleDeleteCred = async (id: number) => {
    if (!confirm("Remove this Meta API connection?")) return;
    await deleteCredMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetMetaCredentialsQueryKey() });
    toast({ title: "Credential removed" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and integrations</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integrations">Meta API</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1">
                <div className="text-sm font-medium text-muted-foreground">Name</div>
                <div className="text-base text-foreground">{user?.name ?? "—"}</div>
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="text-base text-foreground">{user?.email ?? "—"}</div>
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium text-muted-foreground">Email verified</div>
                <div className="flex items-center gap-2">
                  {user?.emailVerified ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-sm text-green-400">Verified</span></>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not verified</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Meta API Credentials</CardTitle>
                {!showAddCred && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddCred(true)} className="gap-1.5" data-testid="button-add-credential">
                    <Plus className="w-3.5 h-3.5" /> Connect
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing credentials */}
              {credsLoading ? null : !creds || creds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Meta API connections yet. Connect your first account to start automating.</p>
              ) : creds.map((cred) => (
                <div key={cred.id} className="flex items-center justify-between p-4 rounded-lg border border-border" data-testid={`cred-item-${cred.id}`}>
                  <div className="flex items-center gap-3">
                    {cred.platform === "facebook" ? <SiFacebook className="w-5 h-5 text-blue-500" /> :
                     cred.platform === "instagram" ? <SiInstagram className="w-5 h-5 text-pink-500" /> :
                     <div className="flex gap-1"><SiFacebook className="w-4 h-4 text-blue-500" /><SiInstagram className="w-4 h-4 text-pink-500" /></div>}
                    <div>
                      <div className="text-sm font-medium">App ID: {cred.appId}</div>
                      <div className="text-xs text-muted-foreground">Token: {cred.tokenPreview}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon(cred.status)}
                    <Badge className={cred.status === "active" ? "bg-green-500/15 text-green-400 text-xs" : "text-xs"}>{cred.status}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCred(cred.id)}
                      data-testid={`button-delete-cred-${cred.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add form */}
              {showAddCred && (
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <div className="text-sm font-semibold text-foreground">Add Meta API Credential</div>
                  <Form {...credForm}>
                    <form onSubmit={credForm.handleSubmit(handleAddCred)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={credForm.control} name="appId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>App ID</FormLabel>
                            <FormControl><Input placeholder="123456789" data-testid="input-app-id" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={credForm.control} name="platform" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-platform"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={credForm.control} name="appSecret" render={({ field }) => (
                        <FormItem>
                          <FormLabel>App Secret</FormLabel>
                          <FormControl><Input type="password" placeholder="Your Meta app secret" data-testid="input-app-secret" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={credForm.control} name="accessToken" render={({ field }) => (
                        <FormItem>
                          <FormLabel>User Access Token</FormLabel>
                          <FormControl><Input type="password" placeholder="Your Meta access token" data-testid="input-access-token" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex gap-2 pt-1">
                        <Button type="submit" size="sm" disabled={createCredMutation.isPending} data-testid="button-submit-credential">
                          {createCredMutation.isPending ? "Connecting..." : "Connect"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddCred(false); credForm.reset(); }}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardContent className="py-10 text-center">
              <CreditCard className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="font-medium text-foreground">Billing coming soon</p>
              <p className="text-sm text-muted-foreground mt-1">You're currently on the free plan</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
