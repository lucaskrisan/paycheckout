import { useEffect } from "react";

export function useOneSignalInit(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    if ((window as any).__oneSignalLoaded) return;
    (window as any).__oneSignalLoaded = true;

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => {
      (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: "5ba5218a-5026-4270-92ce-d2e0ab5509e0",
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true,
            promptOptions: {
              slidedown: {
                prompts: [{
                  type: "push",
                  autoPrompt: true,
                  text: {
                    actionMessage: "Deseja receber notificações de vendas em tempo real?",
                    acceptButton: "Permitir",
                    cancelButton: "Agora não",
                  },
                  delay: { pageViews: 1, timeDelay: 2 },
                }],
              },
            },
          });
          if (typeof OneSignal.login === "function") {
            await OneSignal.login(userId);
          }
          await OneSignal.User.addTag("user_id", userId);
          console.log("[OneSignal] initialized with user_id identity:", userId);
        } catch (err) {
          console.error("[OneSignal] init error:", err);
        }
      });
    };
    document.head.appendChild(script);
  }, [userId]);
}
