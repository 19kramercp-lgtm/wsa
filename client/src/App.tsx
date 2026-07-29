import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth, RequireRole } from "./components/RouteGuards";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
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
import TrainingMaterials from "./pages/TrainingMaterials";
import TrainingCalendar from "./pages/TrainingCalendar";
import UserAccounts from "./pages/UserAccounts";

const ADMIN: ["administrator"] = ["administrator"];

function HomeRoute() {
  const { user } = useAuth();
  if (user && user.role !== "administrator") {
    return <Navigate to="/training/students" replace />;
  }
  return <Dashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<HomeRoute />} />
            <Route
              path="chart-of-accounts"
              element={
                <RequireRole roles={ADMIN}>
                  <ChartOfAccounts />
                </RequireRole>
              }
            />
            <Route
              path="clients"
              element={
                <RequireRole roles={ADMIN}>
                  <Clients />
                </RequireRole>
              }
            />
            <Route
              path="vendors"
              element={
                <RequireRole roles={ADMIN}>
                  <Vendors />
                </RequireRole>
              }
            />
            <Route
              path="general-journal"
              element={
                <RequireRole roles={ADMIN}>
                  <GeneralJournal />
                </RequireRole>
              }
            />
            <Route
              path="general-ledger"
              element={
                <RequireRole roles={ADMIN}>
                  <GeneralLedger />
                </RequireRole>
              }
            />
            <Route
              path="revenues"
              element={
                <RequireRole roles={ADMIN}>
                  <Revenues />
                </RequireRole>
              }
            />
            <Route
              path="expenses"
              element={
                <RequireRole roles={ADMIN}>
                  <Expenses />
                </RequireRole>
              }
            />
            <Route
              path="recurring"
              element={
                <RequireRole roles={ADMIN}>
                  <Recurring />
                </RequireRole>
              }
            />
            <Route
              path="reports"
              element={
                <RequireRole roles={ADMIN}>
                  <Reports />
                </RequireRole>
              }
            />
            <Route
              path="user-accounts"
              element={
                <RequireRole roles={ADMIN}>
                  <UserAccounts />
                </RequireRole>
              }
            />
            <Route path="training/students" element={<Students />} />
            <Route path="training/students/:clientId" element={<StudentProfile />} />
            <Route path="training/materials" element={<TrainingMaterials />} />
            <Route path="training/calendar" element={<TrainingCalendar />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
