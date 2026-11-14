import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import {
  AccountPanel,
  CartDrawer,
  LoginModal,
  SearchOverlay,
  SiteFooter,
  SiteHeader,
  WishlistDrawer,
} from './components/HeaderAndFooter';
import { LandingHome } from './components/LandingHome';
import {
  CollectionsPage,
  ProductDetailPage,
  ShopNowPage,
  ShopPage,
} from './components/ShopPages';
import {
  CheckoutPage,
  OrderHistoryPage,
  OrderTrackingPage,
} from './components/CheckoutAndTracking';
import {
  AboutPage,
  BlogPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
} from './components/InfoPages';
import { AccountDashboardPage } from './components/AccountAndAuth';
import { AdminDashboardPage } from './components/AdminDashboard';

function StoreRouter() {
  const { route, toast } = useStore();
  const cleanRoute = route.split('?')[0] || '/';
  const isAdminRoute = cleanRoute === '/admin' || cleanRoute === '/admin-login';

  const renderPage = () => {
    if (isAdminRoute) {
      return <AdminDashboardPage />;
    }
    if (cleanRoute === '/' || cleanRoute === '/home') {
      return <LandingHome />;
    }
    if (cleanRoute === '/shop') {
      return <ShopPage />;
    }
    if (cleanRoute.startsWith('/product/')) {
      const slug = cleanRoute.replace('/product/', '');
      return <ProductDetailPage slug={slug} />;
    }
    if (cleanRoute === '/shopnow') {
      return <ShopNowPage />;
    }
    if (cleanRoute === '/collections') {
      return <CollectionsPage />;
    }
    if (cleanRoute === '/about') {
      return <AboutPage />;
    }
    if (cleanRoute === '/contact') {
      return <ContactPage />;
    }
    if (cleanRoute === '/blog') {
      return <BlogPage />;
    }
    if (cleanRoute === '/track-order') {
      return <OrderTrackingPage />;
    }
    if (cleanRoute === '/order-history') {
      return <OrderHistoryPage />;
    }
    if (cleanRoute === '/account') {
      return <AccountDashboardPage />;
    }
    if (cleanRoute === '/checkout') {
      return <CheckoutPage />;
    }
    if (cleanRoute === '/privacy') {
      return <PrivacyPage />;
    }
    if (cleanRoute === '/terms') {
      return <TermsPage />;
    }
    return <LandingHome />;
  };

  return (
    <>
      {!isAdminRoute && <SiteHeader />}
      {renderPage()}
      {!isAdminRoute && <SiteFooter />}

      {!isAdminRoute && (
        <>
          <SearchOverlay />
          <CartDrawer />
          <WishlistDrawer />
          <AccountPanel />
          <LoginModal />
        </>
      )}

      {toast && (
        <div className="mf-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <StoreRouter />
    </StoreProvider>
  );
}
