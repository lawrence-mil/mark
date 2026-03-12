import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TerminalLayout } from "./components/TerminalLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { ResultsPage } from "./pages/ResultsPage";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <TerminalLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/:submissionId" element={<ResultsPage />} />
          </Routes>
        </TerminalLayout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
