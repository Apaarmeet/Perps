"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "@/lib/ws";

export function useWebSocket(type: string, callback: (data: unknown) => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const unsub = subscribe(type, (data) => cbRef.current(data));
    return unsub;
  }, [type]);
}
