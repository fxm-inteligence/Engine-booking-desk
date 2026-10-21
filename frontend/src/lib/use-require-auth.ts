import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { hasSession } from "./session";

/** True once the backend accepts the session cookie; otherwise sends the browser to `redirectTo`. */
export function useRequireAuth(redirectTo: string): boolean {
  const navigate = useNavigate();
  const redirect = useCallback((to: string) => navigate(to, { replace: true }), [navigate]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void hasSession().then((signedIn) => {
      if (!active) return;
      if (signedIn) setReady(true);
      else redirect(redirectTo);
    });
    return () => {
      active = false;
    };
  }, [redirect, redirectTo]);

  return ready;
}
