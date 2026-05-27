"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@/hooks/useUser";
import {
  dismissInfoKey,
  loadDismissedInfoKeys,
  resetDismissedInfoKeys,
} from "@/lib/infoDismissalsDb";
import {
  dismissInfoKeyLocally,
  loadDismissedInfoKeysLocally,
} from "@/lib/infoSeenLocal";

type InfoDismissalsContextValue = {
  ready: boolean;
  isDismissed: (infoId: string) => boolean;
  dismiss: (infoId: string) => Promise<void>;
  resetAll: () => Promise<void>;
};

const InfoDismissalsContext = createContext<InfoDismissalsContextValue | undefined>(
  undefined
);

export function InfoDismissalsProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const [keys, setKeys] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    let cancelled = false;

    (async () => {
      try {
        if (!user?.id) {
          if (!cancelled) setKeys(loadDismissedInfoKeysLocally());
          return;
        }
        const loaded = await loadDismissedInfoKeys(user.id);
        if (!cancelled) setKeys(loaded);
      } catch (err) {
        console.warn("InfoDismissalsProvider: laden mislukt", err);
        if (!cancelled) setKeys(loadDismissedInfoKeysLocally());
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, userLoading]);

  const dismiss = useCallback(
    async (infoId: string) => {
      setKeys((prev) => (prev.includes(infoId) ? prev : [...prev, infoId]));
      dismissInfoKeyLocally(infoId);
      if (!user?.id) return;
      try {
        await dismissInfoKey(user.id, infoId);
      } catch (err) {
        console.warn("InfoDismissalsProvider: dismiss mislukt", err);
      }
    },
    [user?.id]
  );

  const resetAll = useCallback(async () => {
    setKeys([]);
    if (!user?.id) return;
    try {
      await resetDismissedInfoKeys(user.id);
    } catch (err) {
      console.warn("InfoDismissalsProvider: reset mislukt", err);
    }
  }, [user?.id]);

  const value = useMemo(
    () => ({
      ready,
      isDismissed: (infoId: string) => keys.includes(infoId),
      dismiss,
      resetAll,
    }),
    [ready, keys, dismiss, resetAll]
  );

  return (
    <InfoDismissalsContext.Provider value={value}>{children}</InfoDismissalsContext.Provider>
  );
}

export function useInfoDismissals(): InfoDismissalsContextValue {
  const ctx = useContext(InfoDismissalsContext);
  if (!ctx) {
    throw new Error("useInfoDismissals must be used within InfoDismissalsProvider");
  }
  return ctx;
}
