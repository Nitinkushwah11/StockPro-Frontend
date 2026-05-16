import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Package,
  ShieldCheck,
  ShoppingCart,
  Users,
  Warehouse,
} from 'lucide-react';
import { authService } from '../services/authService';
import './LandingPage.css';

const featureCards = [
  {
    title: 'Products',
    description: 'Track and manage all your products efficiently.',
    icon: Package,
    tone: 'blue',
  },
  {
    title: 'Warehouses',
    description: 'Manage multiple warehouses and stock levels.',
    icon: Warehouse,
    tone: 'green',
  },
  {
    title: 'Purchases',
    description: 'Create and monitor purchase orders seamlessly.',
    icon: ShoppingCart,
    tone: 'violet',
  },
  {
    title: 'Movements',
    description: 'Control inventory movement from receiving to reporting.',
    icon: ArrowLeftRight,
    tone: 'orange',
  },
  {
    title: 'Roles',
    description: 'Secure access with role-based permissions.',
    icon: Users,
    tone: 'cyan',
  },
];

const StockProMark = () => (
  <span className="brand-mark" aria-hidden="true">
    <span className="brand-mark-top"></span>
    <span className="brand-mark-left"></span>
    <span className="brand-mark-right"></span>
  </span>
);

const LandingPage = () => {
  const isAuthenticated = authService.isAuthenticated();
  const primaryPath = isAuthenticated ? '/dashboard' : '/login';

  return (
    <main className="landing-page">
      <section className="landing-panel" aria-labelledby="landing-title">
        <header className="landing-topbar">
          <div className="topbar-dots" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, index) => (
              <span key={index}></span>
            ))}
          </div>
          <Link to="/" className="landing-brand" aria-label="StockPro home">
            <StockProMark />
            <span>
              Stock<span>Pro</span>
            </span>
          </Link>
          <div className="topbar-rings" aria-hidden="true"></div>
          <nav className="landing-nav-actions" aria-label="Landing actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="landing-nav-link">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="landing-nav-link">
                  Login
                </Link>
                <Link to="/register" className="landing-nav-link landing-nav-link-solid">
                  Register
                </Link>
              </>
            )}
          </nav>
        </header>

        <div className="landing-content">
          <div className="landing-copy">
            <h1 id="landing-title">
              <span>Smarter inventory.</span>
              <span>Smoother operations.</span>
            </h1>
            <span className="landing-accent" aria-hidden="true"></span>
            <p>
              A unified system to manage products, warehouses, purchases, movements, and roles - all in one place.
            </p>
            <div className="landing-actions">
              <Link to={primaryPath} className="landing-primary-action">
                {isAuthenticated ? 'Open dashboard' : 'Sign in'}
                <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="landing-secondary-action">
                  Create account
                </Link>
              )}
            </div>
          </div>

          <div className="operations-visual" aria-label="Inventory operations overview">
            <div className="visual-blob visual-blob-large" aria-hidden="true"></div>
            <div className="visual-blob visual-blob-small" aria-hidden="true"></div>
            <div className="warehouse-illustration" aria-hidden="true">
              <div className="warehouse-roof"></div>
              <div className="warehouse-body">
                <div className="warehouse-door"></div>
                <span className="box box-one"></span>
                <span className="box box-two"></span>
                <span className="box box-three"></span>
                <span className="box box-four"></span>
              </div>
              <div className="warehouse-ground"></div>
            </div>
            <div className="checklist-card" aria-hidden="true">
              <div className="clipboard-clip"></div>
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="check-row" key={index}>
                  <span>
                    <Check size={16} strokeWidth={3} />
                  </span>
                  <i></i>
                </div>
              ))}
            </div>
            <div className="bar-stack" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="donut-chart" aria-hidden="true"></div>
            <span className="floating-dot dot-blue"></span>
            <span className="floating-dot dot-green"></span>
            <span className="floating-ring"></span>
            <span className="floating-plus">+</span>
          </div>
        </div>

        <div className="landing-features" aria-label="StockPro modules">
          {featureCards.map(({ title, description, icon: Icon, tone }) => (
            <Link to={primaryPath} className="landing-feature" key={title}>
              <span className={`feature-icon feature-${tone}`}>
                <Icon size={30} strokeWidth={2.2} />
              </span>
              <strong>{title}</strong>
              <span>{description}</span>
            </Link>
          ))}
        </div>

        <footer className="landing-control-strip">
          <span className="strip-badge" aria-hidden="true">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </span>
          <strong>One system.</strong>
          <span>Complete control.</span>
          <em>Better decisions.</em>
        </footer>
      </section>
    </main>
  );
};

export default LandingPage;
