import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { App } from "./App";
import "./styles.css";

// Initialize PostHog
posthog.init("phc_n98BKZBYnJrmY8pX5NWMqJjWct4mIbnUuUubAtp5Iw", {
  api_host: "https://us.i.posthog.com", // Default US host. Use https://eu.i.posthog.com for EU.
  person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
