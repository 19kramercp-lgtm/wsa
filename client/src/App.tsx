import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import GeneralJournal from "./pages/GeneralJournal";
import GeneralLedger from "./pages/GeneralLedger";
import Revenues from "./pages/Revenues";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="general-journal" element={<GeneralJournal />} />
          <Route path="general-ledger" element={<GeneralLedger />} />
          <Route path="revenues" element={<Revenues />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
