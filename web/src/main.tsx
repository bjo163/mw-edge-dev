import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { applyAppearancePreferences } from "./design/appearance";
import "./styles.css";

applyAppearancePreferences();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
