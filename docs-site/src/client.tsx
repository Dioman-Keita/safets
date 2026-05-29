import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
