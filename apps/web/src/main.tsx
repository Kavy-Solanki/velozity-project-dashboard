import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App() {
  return <main>Velozity Client Project Dashboard</main>;
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("The application root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
