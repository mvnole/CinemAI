// App.js
import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import "video-react/dist/video-react.css";

import HomePage from "./pages/HomePage";
import ManageProfilesPage from "./pages/ManageProfilesPage";
import SearchPage from "./pages/SearchPage";
import { FilmPage } from "./pages/FilmPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import WatchPage from "./pages/WatchPage";
import { SettingsPage } from "./components/SettingsPage";
import UserPage from "./pages/UserPage";
import { FilmPageModal } from "./components/FilmPageModal";
import OutsideClickWrapper from "./components/OutsideClickWrapper";
import FilmsPage from "./pages/FilmsPage";
import Header from "./components/Header";
import RegisterPage from "./pages/RegisterPage";
import { useUser } from "./context/UserContext";
import LoginPage from "./pages/LoginPage";

function App() {
  const [showUsers, setShowUsers] = useState(false);
  const mobileUserRef = useRef();
  const desktopUserRef = useRef();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const { isLoading, user, setIsLoading } = useUser();

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        (mobileUserRef.current && !mobileUserRef.current.contains(event.target)) &&
        (desktopUserRef.current && !desktopUserRef.current.contains(event.target))
      ) {
        setShowUsers(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutsideSettings = (e) => {
      const settingsWrapper = document.querySelector(".settings-wrapper");
      if (location.pathname === "/settings" && settingsWrapper && !settingsWrapper.contains(e.target)) {
        navigate("/");
      }
    };
    document.addEventListener("mousedown", handleClickOutsideSettings);
    return () => document.removeEventListener("mousedown", handleClickOutsideSettings);
  }, [location, navigate]);

  // 🔁 Fallback: dacă userul e confirmat și fără plan, îl trimitem spre /subscription
  useEffect(() => {
  if (
    !isLoading &&
    user?.confirmed_at &&
    location.pathname === "/" &&
    !user?.user_metadata?.plan
  ) {
    navigate("/subscription");
  }
}, [isLoading, user, location.pathname, navigate]);

  const fakeUsers = [
    { name: "Bossulică" },
    { name: "Andreea cu pisici" },
    { name: "Gigel 69" },
    { name: "Ana de la bloc" },
    { name: "Nea Fănel zis Fanea" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-800 text-white">
      <Header
        showUsers={showUsers}
        setShowUsers={setShowUsers}
        userMenuRef={mobileUserRef}
        userList={fakeUsers}
      />

      <main className="p-6 space-y-10 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={state?.modal ? state.backgroundLocation?.pathname : location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={state?.modal ? state.backgroundLocation || location : location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/manage-profiles" element={<ManageProfilesPage />} />
              <Route path="/movies" element={<h2 className="text-xl">Movies Page (în lucru)</h2>} />
              <Route path="/watch/:id" element={<WatchPage />} />
              <Route path="/tv-shows" element={<h2 className="text-xl">TV Shows Page (în lucru)</h2>} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/films" element={<FilmsPage />} />
              <Route path="/register" element={<RegisterPage />} />
              {!state?.modal && (
                <Route
                  path="/film/:id"
                  element={
                    <OutsideClickWrapper redirectTo={location.state?.fromSearch ? "/search" : "/"}>
                      <FilmPage />
                    </OutsideClickWrapper>
                  }
                />
              )}
              <Route
                path="/settings"
                element={
                  <OutsideClickWrapper redirectTo="/">
                    <div className="settings-wrapper">
                      <SettingsPage />
                    </div>
                  </OutsideClickWrapper>
                }
              />
              <Route path="/user/:id" element={<UserPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Routes>

            {/* MODAL film */}
            {state?.modal && (
              <Routes>
                <Route path="/film/:id" element={<FilmPageModal />} />
              </Routes>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
