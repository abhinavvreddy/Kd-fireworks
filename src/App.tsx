import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { ScrollToTop } from './components/ScrollToTop.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { BackendStatusModal } from './components/BackendStatusModal.tsx';
import { api } from './api/client.ts';

// Pages
import { HomePage } from './pages/HomePage.tsx';
import { CataloguePage } from './pages/CataloguePage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderSuccessPage } from './pages/OrderSuccessPage.tsx';
import { OrderTrackingPage } from './pages/OrderTrackingPage.tsx';
import { CommunitiesPage } from './pages/CommunitiesPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';

function AppContent() {
  const [isBackendInfoOpen, setIsBackendInfoOpen] = useState(false);
  const { isLiveBackend, checkBackendHealth } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-[#0B132B] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950">
      <ScrollToTop />
      
      {/* Persistent Navigation Bar across all pages */}
      <Navbar onOpenBackendInfo={() => setIsBackendInfoOpen(true)} />

      {/* Page Routing */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogue" element={<CataloguePage />} />
          <Route path="/products" element={<CataloguePage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
          <Route path="/orders" element={<OrderTrackingPage />} />
          <Route path="/orders/track" element={<OrderTrackingPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Architecture & Backend Specs Modal */}
      <BackendStatusModal
        isOpen={isBackendInfoOpen}
        onClose={() => setIsBackendInfoOpen(false)}
        isLiveBackend={isLiveBackend}
        currentUrl={api.getBaseUrl()}
        onUpdateUrl={async (url) => {
          api.setBaseUrl(url);
          await checkBackendHealth();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </BrowserRouter>
  );
}
