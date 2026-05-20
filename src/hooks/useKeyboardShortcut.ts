"use client";

import { useEffect, useRef } from "react";

type Modifier = "ctrlOrMeta" | "ctrl" | "meta";

export type Shortcut = {
  key: string;
  mod?: Modifier;
  alt?: boolean;
  shift?: boolean;
};

function matchShortcut(event: KeyboardEvent, shortcut: Shortcut) {
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

  const modMatch = shortcut.mod
    ? shortcut.mod === "ctrlOrMeta"
      ? event.ctrlKey || event.metaKey
      : shortcut.mod === "ctrl"
      ? event.ctrlKey && !event.metaKey
      : event.metaKey && !event.ctrlKey
    : true;

  const altMatch = shortcut.alt === undefined ? true : shortcut.alt === event.altKey;
  const shiftMatch = shortcut.shift === undefined ? true : shortcut.shift === event.shiftKey;

  return keyMatch && modMatch && altMatch && shiftMatch;
}

export function useKeyboardShortcut(
  shortcut: Shortcut,
  callback: () => void,
  enabled = true
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    function onKey(event: KeyboardEvent) {
      if (matchShortcut(event, shortcut)) {
        event.preventDefault();
        callbackRef.current();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, shortcut]);
}
