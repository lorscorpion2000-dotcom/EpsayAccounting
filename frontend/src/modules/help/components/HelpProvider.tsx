import { createContext, useContext, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getHelpForPath, PageHelp } from '../helpContent';
import HelpDrawer from './HelpDrawer';

interface HelpContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  currentHelp: PageHelp | null;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelp must be used inside HelpProvider');
  return ctx;
}

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const currentHelp = getHelpForPath(location.pathname);

  return (
    <HelpContext.Provider
      value={{
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        isOpen,
        currentHelp,
      }}
    >
      {children}
      <HelpDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        help={currentHelp}
      />
    </HelpContext.Provider>
  );
}
