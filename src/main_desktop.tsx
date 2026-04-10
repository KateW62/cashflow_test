import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AppDesktop from './App_desktop.tsx';
import './styles/electric-velocity.css';

function Main() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [forceDesktop, setForceDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024 || forceDesktop);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [forceDesktop]);

  // 手动切换桌面模式：按 Ctrl + D
  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'd' && e.ctrlKey) {
        setForceDesktop(prev => !prev);
      }
    };

    window.addEventListener('keydown', onKeyPress);
    return () => window.removeEventListener('keydown', onKeyPress);
  }, [forceDesktop]);

  return isDesktop || forceDesktop ? <AppDesktop /> : <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);