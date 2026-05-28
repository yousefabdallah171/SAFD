import { useAuthStore } from "@/hooks/use-auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Initialize the API client with the token getter
setAuthTokenGetter(() => {
  return useAuthStore.getState().token;
});
