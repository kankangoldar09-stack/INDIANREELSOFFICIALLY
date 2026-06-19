// @ts-nocheck
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface BirthdayContextType {
  isBirthday: boolean;
  userName: string;
  showAnimation: boolean;
  dismissAnimation: () => void;
  birthdayTheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

const BirthdayContext = createContext<BirthdayContextType | undefined>(undefined);

export const useBirthday = () => {
  const context = useContext(BirthdayContext);
  if (!context) {
    throw new Error('useBirthday must be used within BirthdayProvider');
  }
  return context;
};

interface BirthdayProviderProps {
  children: ReactNode;
}

export const BirthdayProvider = ({ children }: BirthdayProviderProps) => {
  const { profile } = useAuth();
  const [isBirthday, setIsBirthday] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [userName, setUserName] = useState('');

  // Birthday theme colors (Golden & Sparkly)
  const birthdayTheme = {
    primary: '#FFD700', // Gold
    secondary: '#FFA500', // Orange Gold
    accent: '#FFEC8B', // Light Gold
    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)'
  };

  // Check if today is user's birthday
  useEffect(() => {
    if (!profile?.dob) {
      setIsBirthday(false);
      return;
    }

    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate(); // 1-31

    // Parse DOB (format: YYYY-MM-DD)
    const dobDate = new Date(profile.dob);
    const dobMonth = dobDate.getMonth() + 1;
    const dobDay = dobDate.getDate();

    // Check if today matches birthday
    const isUserBirthday = todayMonth === dobMonth && todayDay === dobDay;
    setIsBirthday(isUserBirthday);

    // Set user name
    setUserName(profile.full_name || profile.username || 'Bhai');

    // Check if animation should be shown
    if (isUserBirthday) {
      const todayKey = `${today.getFullYear()}-${todayMonth}-${todayDay}`;
      const animationShownKey = `birthday_animation_shown_${todayKey}`;
      const hasShownToday = localStorage.getItem(animationShownKey);

      if (!hasShownToday) {
        setShowAnimation(true);
      }

      // Apply birthday theme to CSS variables
      applyBirthdayTheme();
    } else {
      // Remove birthday theme
      removeBirthdayTheme();
    }
  }, [profile]);

  // Apply birthday theme to CSS custom properties
  const applyBirthdayTheme = () => {
    const root = document.documentElement;
    
    // Store original theme
    if (!root.getAttribute('data-original-theme-stored')) {
      root.setAttribute('data-original-primary', getComputedStyle(root).getPropertyValue('--primary'));
      root.setAttribute('data-original-theme-stored', 'true');
    }

    // Apply golden theme
    root.style.setProperty('--primary', '45 100% 51%'); // Gold in HSL
    root.style.setProperty('--primary-foreground', '0 0% 0%'); // Black text on gold
    root.style.setProperty('--accent', '38 100% 50%'); // Orange gold
    root.style.setProperty('--accent-foreground', '0 0% 0%');
    
    // Add sparkle class to body
    document.body.classList.add('birthday-mode');
  };

  // Remove birthday theme
  const removeBirthdayTheme = () => {
    const root = document.documentElement;
    
    // Restore original theme
    const originalPrimary = root.getAttribute('data-original-primary');
    if (originalPrimary) {
      root.style.setProperty('--primary', originalPrimary);
    }

    // Remove sparkle class
    document.body.classList.remove('birthday-mode');
  };

  // Dismiss animation
  const dismissAnimation = () => {
    setShowAnimation(false);

    // Mark animation as shown for today
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const animationShownKey = `birthday_animation_shown_${todayKey}`;
    localStorage.setItem(animationShownKey, 'true');
  };

  return (
    <BirthdayContext.Provider
      value={{
        isBirthday,
        userName,
        showAnimation,
        dismissAnimation,
        birthdayTheme
      }}
    >
      {children}
    </BirthdayContext.Provider>
  );
};
