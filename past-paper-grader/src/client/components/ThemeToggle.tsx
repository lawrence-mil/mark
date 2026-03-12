import { Switch } from "@headlessui/react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("theme") !== "terminal-light";
  });

  useEffect(() => {
    const theme = dark ? "terminal" : "terminal-light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [dark]);

  return (
    <Switch.Group as="div" className="flex items-center gap-2">
      <Switch.Label className="text-xs opacity-60 select-none">
        {dark ? "DARK" : "LIGHT"}
      </Switch.Label>
      <Switch
        checked={dark}
        onChange={setDark}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-sm border border-current/30 transition-colors duration-200 ${
          dark ? "bg-primary/20" : "bg-base-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-sm bg-current transition duration-200 ${
            dark ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </Switch>
    </Switch.Group>
  );
}
