import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./expense.css";
import "./modal.css";
import "./lessons.css";
import "./cash.css";
import "./students.css";
import "./reports.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
