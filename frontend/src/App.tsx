import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './modules/auth/AuthContext';
import { LoginPage } from './modules/auth/LoginPage';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { HomePage } from './modules/home/HomePage';
import { ClientsListPage } from './modules/clients/ClientsListPage';
import { CreateClientPage } from './modules/clients/CreateClientPage';
import { EditClientPage } from './modules/clients/EditClientPage';
import { ProfilePage } from './modules/profile/ProfilePage';
import { ConfigPage } from './modules/config/ConfigPage';
import { CreditsHomePage } from './modules/credits/CreditsHomePage';
import { CreditsListPage } from './modules/credits/CreditsListPage';
import { CreditStudyPage } from './modules/credits/CreditStudyPage';
import { CreditResultPage } from './modules/credits/CreditResultPage';
import { CreditSignPage } from './modules/credits/CreditSignPage';
import { CreditSuccessPage } from './modules/credits/CreditSuccessPage';
import { CreditPortfolioPage } from './modules/credits/CreditPortfolioPage';
import { CreditDocumentsPage } from './modules/credits/CreditDocumentsPage';
import { UsersListPage } from './modules/users/UsersListPage';
import { PortfolioPage } from './modules/portfolio/PortfolioPage';
import { DiscountsPage } from './modules/discounts/DiscountsPage';
import { SurveysPage } from './modules/surveys/SurveysPage';
import { ExpensesPage } from './modules/expenses/ExpensesPage';
import { ComplaintsPage } from './modules/complaints/ComplaintsPage';
import { PricesPage } from './modules/prices/PricesPage';
import { NewProductsPage } from './modules/newProducts/NewProductsPage';
import { RoutesPage } from './modules/routes/RoutesPage';
import { BrainPage } from './modules/brain/BrainPage';
import { ProfilesPage } from './modules/profiles/ProfilesPage';
import { CalculatorPage } from './modules/calculator/CalculatorPage';
import { CatalogPage } from './modules/catalog/CatalogPage';
import { PromosPage } from './modules/promos/PromosPage';
import { PromoCreatePage } from './modules/promos/PromoCreatePage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { SuperAdminGlobalConfigPage } from './modules/global/SuperAdminGlobalConfigPage';

// Vista de pruebas (callbacks de créditos): solo se empaqueta en desarrollo
// (import dinámico condicional + ruta con import.meta.env.DEV), nunca en prod.
const TestViewPage = import.meta.env.DEV
  ? lazy(() => import('./modules/test/TestViewPage').then((m) => ({ default: m.TestViewPage })))
  : null;

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/new"
            element={
              <ProtectedRoute>
                <CreateClientPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id/edit"
            element={
              <ProtectedRoute>
                <EditClientPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/config"
            element={
              <ProtectedRoute>
                <ConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/global-config"
            element={
              <ProtectedRoute>
                <SuperAdminGlobalConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits"
            element={
              <ProtectedRoute>
                <CreditsHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits/list"
            element={
              <ProtectedRoute>
                <CreditsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits/study"
            element={
              <ProtectedRoute>
                <CreditStudyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits/result/:id"
            element={
              <ProtectedRoute>
                <CreditResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits/sign/:id"
            element={
              <ProtectedRoute>
                <CreditSignPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits/success/:id"
            element={
              <ProtectedRoute>
                <CreditSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits/mine"
            element={
              <ProtectedRoute>
                <CreditPortfolioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits/:id/documents"
            element={
              <ProtectedRoute>
                <CreditDocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profiles"
            element={
              <ProtectedRoute>
                <ProfilesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {TestViewPage && (
            <Route
              path="/test"
              element={
                <ProtectedRoute>
                  <Suspense fallback={null}>
                    <TestViewPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          )}
          <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
          <Route path="/discounts" element={<ProtectedRoute><DiscountsPage /></ProtectedRoute>} />
          <Route path="/surveys" element={<ProtectedRoute><SurveysPage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
          <Route path="/complaints" element={<ProtectedRoute><ComplaintsPage /></ProtectedRoute>} />
          <Route path="/prices" element={<ProtectedRoute><PricesPage /></ProtectedRoute>} />
          <Route path="/new-products" element={<ProtectedRoute><NewProductsPage /></ProtectedRoute>} />
          <Route path="/routes" element={<ProtectedRoute><RoutesPage /></ProtectedRoute>} />
          <Route path="/brain" element={<ProtectedRoute><BrainPage /></ProtectedRoute>} />
          <Route path="/calculator" element={<ProtectedRoute><CalculatorPage /></ProtectedRoute>} />
          <Route path="/catalog" element={<ProtectedRoute><CatalogPage /></ProtectedRoute>} />
          <Route path="/promos" element={<ProtectedRoute><PromosPage /></ProtectedRoute>} />
          <Route path="/promos/nueva" element={<ProtectedRoute><PromoCreatePage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}