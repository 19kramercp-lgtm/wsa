import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Clients from "./pages/Clients";
import Vendors from "./pages/Vendors";
import GeneralJournal from "./pages/GeneralJournal";
import GeneralLedger from "./pages/GeneralLedger";
import Revenues from "./pages/Revenues";
import Expenses from "./pages/Expenses";
import Recurring from "./pages/Recurring";
import Reports from "./pages/Reports";
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import EndorsementsPage from "./pages/EndorsementsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="clients" element={<Clients />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="general-journal" element={<GeneralJournal />} />
          <Route path="general-ledger" element={<GeneralLedger />} />
          <Route path="revenues" element={<Revenues />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="recurring" element={<Recurring />} />
          <Route path="reports" element={<Reports />} />
          <Route path="training/students" element={<Students />} />
          <Route path="training/students/:clientId" element={<StudentProfile />} />
          <Route path="training/endorsements" element={<EndorsementsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
