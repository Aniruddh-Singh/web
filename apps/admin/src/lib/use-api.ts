"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

/** Loads one API resource with reload support and a friendly error. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    const t = setTimeout(() => void reload(), 0);
    return () => clearTimeout(t);
  }, [reload]);

  return { data, setData, error, loading, reload };
}

/** Turns an API failure into { message, fieldErrors } for forms. */
export function formError(e: unknown): { message: string; fields: Record<string, string> } {
  if (e instanceof ApiError) {
    return { message: e.message, fields: Object.fromEntries(e.issues.map((i) => [i.path, i.message])) };
  }
  return { message: "Something went wrong. Check your connection and try again.", fields: {} };
}
