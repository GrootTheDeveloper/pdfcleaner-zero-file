'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { AuthModal } from '../components/AuthModal';
import { LogOut, Shield, ChevronDown, User, X, Sun, Moon } from 'lucide-react';
import { telemetryClient } from '../lib/telemetry-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const PDFCleanerApp = dynamic(() => import('@/components/PDFCleanerApp'), {
  ssr: false,
  loading: () => (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4" />
      Loading PDFCleaner...
    </div>
  ),
});

export default function Home() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState('1.0.0');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [optOut, setOptOut] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  } | null>(null);

  // Reset and File states for header control
  const [resetTrigger, setResetTrigger] = useState(0);
  const [hasFile, setHasFile] = useState(false);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Register service worker for PWA support only in production
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('Service Worker registered with scope:', reg.scope))
          .catch((err) => console.warn('Service Worker registration failed:', err));
      } else {
        // Automatically unregister service workers in development to prevent Fast Refresh loops
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((unregistered) => {
              if (unregistered) {
                console.log('Unregistered service worker in development:', registration.scope);
              }
            });
          }
        });
        // Clear caches as well to remove cached index.html
        if (typeof window !== 'undefined' && window.caches) {
          window.caches.keys().then((keys) => {
            keys.forEach((key) => {
              window.caches.delete(key);
            });
          });
        }
      }
    }

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(
        e as unknown as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> },
      );
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Flush telemetry when page loads (if online)
    void telemetryClient.flushOfflineQueues();

    // Fetch version and options asynchronously
    const initPage = async () => {
      try {
        setOptOut(telemetryClient.getOptOut());
        const res = await fetch(`${API_BASE_URL}/app-version/latest`);
        if (res.ok) {
          const data = (await res.json()) as { version: string };
          setLatestVersion(data.version);
        }
      } catch {
        // Fallback silently if offline
      }
    };
    void initPage();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
    }
  };

  const handleToggleOptOut = (checked: boolean) => {
    setOptOut(checked);
    telemetryClient.setOptOut(checked);
  };

  return (
    <main className="min-h-screen bg-background dot-grid text-foreground flex flex-col items-center p-4 sm:p-8 font-sans selection:bg-accent-blue/30 relative">
      <div className="absolute inset-0 noise-overlay opacity-[0.015] dark:opacity-[0.025] mix-blend-overlay pointer-events-none"></div>

      {/* Header */}
      <header className="w-full max-w-6xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1">
            <span>PDF</span>
            <span className="text-accent-red">Cleaner</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            {t('appSubtitle')}
          </p>
          <div className="mt-3.5">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-badge-bg border border-badge-text/10 text-badge-text text-xs font-semibold shadow-sm">
              {language === 'vi'
                ? 'Tệp không rời khỏi thiết bị - xử lý 100% trong trình duyệt'
                : 'Files never leave your device - processed 100% client-side'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Back to Start (only shown when a file is selected) */}
          {hasFile && (
            <button
              onClick={() => {
                setResetTrigger((prev) => prev + 1);
              }}
              className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              ← {language === 'vi' ? 'Quay lại' : 'Back'}
            </button>
          )}

          {/* Privacy Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            {t('privacySettings')}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            title={
              theme === 'light'
                ? language === 'vi'
                  ? 'Chuyển sang giao diện tối'
                  : 'Switch to Dark Mode'
                : language === 'vi'
                  ? 'Chuyển sang giao diện sáng'
                  : 'Switch to Light Mode'
            }
          >
            {theme === 'light' ? (
              <Moon className="w-3.5 h-3.5 text-slate-600 fill-current" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-yellow-500 fill-current" />
            )}
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer font-bold text-[10px]"
            title={language === 'en' ? 'Chuyển sang tiếng Việt' : 'Switch to English'}
          >
            {language === 'en' ? 'EN' : 'VI'}
          </button>

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
              title="Install App as PWA"
            >
              {t('installApp')}
            </button>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer shadow-sm"
              >
                <div className="w-5 h-5 rounded-full bg-accent-red/20 text-accent-red flex items-center justify-center font-bold text-xs uppercase">
                  {user.email.charAt(0)}
                </div>
                <span className="max-w-[100px] truncate">{user.email}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl z-20 text-sm">
                    <button
                      onClick={async () => {
                        await logout();
                        setIsDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-red-500 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent-red hover:bg-accent-red/90 text-white font-semibold text-xs shadow-sm shadow-accent-red/10 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              {t('signIn')}
            </button>
          )}
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="w-full max-w-6xl z-10 flex-1 flex flex-col">
        <PDFCleanerApp onFileChange={(f) => setHasFile(!!f)} resetTrigger={resetTrigger} />
      </div>

      <footer className="w-full max-w-6xl mt-12 py-6 text-center text-xs text-slate-500/70 z-10 flex flex-col gap-2">
        <p className="font-semibold text-slate-600 dark:text-slate-400">
          Developed by{' '}
          <a
            href="https://github.com/GrootTheDeveloper"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-red font-bold hover:underline"
          >
            GrootTheDeveloper
          </a>{' '}
          © 2026
        </p>
        <p className="text-[10px] opacity-75">
          {t('privacyFooter')} • Version {latestVersion}
        </p>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/60 backdrop-blur-md"
            onClick={() => setIsSettingsOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-700 dark:text-slate-100 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Shield className="w-5 h-5 text-accent-red" />
              {t('privacySettings')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                    {t('telemetryTitle')}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('telemetryDesc')}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!optOut}
                  onChange={(e) => handleToggleOptOut(!e.target.checked)}
                  className="w-4 h-4 accent-accent-red bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">* {t('privacyDisclaimer')}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
