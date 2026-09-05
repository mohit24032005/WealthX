import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import WealthVault from "./pages/WealthVault";
import Goals from "./pages/Goals";
import FinancialXRay from "./pages/FinancialXRay";
import ActionPlan from "./pages/ActionPlan";
import InvestmentHub from "./pages/InvestmentHub";
import StocksExplorer from "./pages/StocksExplorer";
import InvestmentEduPage from "./pages/InvestmentEduPage";
import CalculatorsHub from "./pages/calculators/CalculatorsHub";
import SIPCalculator from "./pages/calculators/SIPCalculator";
import StepUpSIPCalculator from "./pages/calculators/StepUpSIPCalculator";
import EMICalculator from "./pages/calculators/EMICalculator";
import FDCalculator from "./pages/calculators/FDCalculator";
import GoalTargetCalculator from "./pages/calculators/GoalTargetCalculator";
import LoansOverview from "./pages/loans/LoansOverview";
import LoanFinder from "./pages/loans/LoanFinder";
import CompareLoans from "./pages/loans/CompareLoans";
import RiskDNA from "./pages/RiskDNA";
import AIDecisionLab from "./pages/AIDecisionLab";
import MyNextMoney from "./pages/MyNextMoney";
import FutureYou from "./pages/FutureYou";
import HypeCheck from "./pages/HypeCheck";
import GovernmentSchemes from "./pages/GovernmentSchemes";
import FinancialHistory from "./pages/FinancialHistory";
import Settings from "./pages/Settings";
import InvestorQuest from "./pages/InvestorQuest";
import IntroVideo from "./components/IntroVideo";
import AIRecoveryStudio from "./pages/recovery/AIRecoveryStudio";
import AIFinanceController from "./pages/recovery/AIFinanceController";
import RecoveryAuditTrail from "./pages/recovery/RecoveryAuditTrail";
import RecoverySimulator from "./pages/recovery/RecoverySimulator";

import "./App.css";

function App() {
  const [showVideo, setShowVideo] = useState(() => {
    return localStorage.getItem("introVideoSeen") !== "true";
  });

  const handleFinishIntro = () => {
    localStorage.setItem("introVideoSeen", "true");
    setShowVideo(false);
  };

  if (showVideo) {
    return <IntroVideo onFinish={handleFinishIntro} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <Signup />
              </PublicOnlyRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Razorpay AI Buildathon Modules (Track 03 & Track 04) */}
          <Route
            path="/revenue-recovery"
            element={
              <ProtectedRoute requireOnboarded={false}>
                <AIRecoveryStudio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance-controller"
            element={
              <ProtectedRoute requireOnboarded={false}>
                <AIFinanceController />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recovery-audit"
            element={
              <ProtectedRoute requireOnboarded={false}>
                <RecoveryAuditTrail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recovery-simulator"
            element={
              <ProtectedRoute requireOnboarded={false}>
                <RecoverySimulator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wealth-vault"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <WealthVault />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <Goals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial-xray"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <FinancialXRay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/action-plan"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <ActionPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-dna"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <RiskDNA />
              </ProtectedRoute>
            }
          />

          {/* Decide Smarter Suite */}
          <Route
            path="/ai-decision-lab"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <AIDecisionLab />
              </ProtectedRoute>
            }
          />
          <Route
            path="/decision-lab"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <AIDecisionLab />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-next-money"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <MyNextMoney />
              </ProtectedRoute>
            }
          />
          <Route
            path="/future-you"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <FutureYou />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hype-check"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <HypeCheck />
              </ProtectedRoute>
            }
          />

          {/* Discover & Schemes & Games */}
          <Route
            path="/schemes"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <GovernmentSchemes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investor-quest"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <InvestorQuest />
              </ProtectedRoute>
            }
          />

          {/* History & Settings */}
          <Route
            path="/history"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <FinancialHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Invest & Save Routes */}
          <Route
            path="/investments"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <InvestmentHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investments/stocks"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <StocksExplorer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investments/sip"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <InvestmentEduPage defaultCategory="sip" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investments/gold"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <InvestmentEduPage defaultCategory="gold" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investments/fd"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <InvestmentEduPage defaultCategory="fd" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investments/bonds"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <InvestmentEduPage defaultCategory="bonds" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investments/etfs"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <InvestmentEduPage defaultCategory="etfs" />
              </ProtectedRoute>
            }
          />

          {/* Calculators Suite Routes */}
          <Route
            path="/calculators"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <CalculatorsHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculators/sip"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <SIPCalculator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculators/step-up-sip"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <StepUpSIPCalculator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculators/emi"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <EMICalculator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculators/fd"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <FDCalculator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculators/goal"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <GoalTargetCalculator />
              </ProtectedRoute>
            }
          />

          {/* Loans & Debt Routes */}
          <Route
            path="/loans"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <LoansOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loans/finder"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <LoanFinder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loans/compare"
            element={
              <ProtectedRoute requireOnboarded={true}>
                <CompareLoans />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);
}

export default App;