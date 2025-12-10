import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

// Each theme defines HSL values (without the hsl() wrapper since Tailwind adds that)
const themeStyles: Record<string, Record<string, string>> = {
  dark: {
    '--background': '261 13% 14%',
    '--foreground': '210 40% 98%',
    '--card': '261 13% 18%',
    '--card-foreground': '210 40% 98%',
    '--popover': '261 13% 14%',
    '--popover-foreground': '210 40% 98%',
    '--primary': '262 47% 55%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '187 48% 48%',
    '--secondary-foreground': '222.2 47.4% 11.2%',
    '--muted': '261 13% 20%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '261 63% 75%',
    '--accent-foreground': '210 40% 98%',
    '--destructive': '0 62.8% 50.6%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '261 13% 25%',
    '--input': '261 13% 25%',
    '--ring': '262 47% 55%',
    '--sidebar-background': '263 28% 14%',
    '--sidebar-foreground': '240 5.3% 90%',
    '--sidebar-primary': '262 47% 55%',
    '--sidebar-primary-foreground': '0 0% 98%',
    '--sidebar-accent': '263 28% 24%',
    '--sidebar-accent-foreground': '240 5.9% 90%',
    '--sidebar-border': '263 28% 30%',
    '--sidebar-ring': '252 95% 85%',
  },
  midnight: {
    '--background': '222 47% 11%',
    '--foreground': '210 40% 98%',
    '--card': '222 47% 14%',
    '--card-foreground': '210 40% 98%',
    '--popover': '222 47% 11%',
    '--popover-foreground': '210 40% 98%',
    '--primary': '217 91% 60%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '199 89% 48%',
    '--secondary-foreground': '222.2 47.4% 11.2%',
    '--muted': '222 47% 18%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '217 91% 70%',
    '--accent-foreground': '210 40% 98%',
    '--destructive': '0 62.8% 50.6%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '222 47% 22%',
    '--input': '222 47% 22%',
    '--ring': '217 91% 60%',
    '--sidebar-background': '222 47% 9%',
    '--sidebar-foreground': '240 5.3% 90%',
    '--sidebar-primary': '217 91% 60%',
    '--sidebar-primary-foreground': '0 0% 98%',
    '--sidebar-accent': '222 47% 18%',
    '--sidebar-accent-foreground': '240 5.9% 90%',
    '--sidebar-border': '222 47% 25%',
    '--sidebar-ring': '217 91% 70%',
  },
  forest: {
    '--background': '150 30% 10%',
    '--foreground': '150 10% 95%',
    '--card': '150 30% 13%',
    '--card-foreground': '150 10% 95%',
    '--popover': '150 30% 10%',
    '--popover-foreground': '150 10% 95%',
    '--primary': '142 71% 45%',
    '--primary-foreground': '150 30% 10%',
    '--secondary': '162 63% 35%',
    '--secondary-foreground': '150 10% 95%',
    '--muted': '150 30% 16%',
    '--muted-foreground': '150 10% 65%',
    '--accent': '142 50% 55%',
    '--accent-foreground': '150 30% 10%',
    '--destructive': '0 62.8% 50.6%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '150 30% 20%',
    '--input': '150 30% 20%',
    '--ring': '142 71% 45%',
    '--sidebar-background': '150 30% 8%',
    '--sidebar-foreground': '150 10% 90%',
    '--sidebar-primary': '142 71% 45%',
    '--sidebar-primary-foreground': '150 30% 10%',
    '--sidebar-accent': '150 30% 14%',
    '--sidebar-accent-foreground': '150 10% 90%',
    '--sidebar-border': '150 30% 18%',
    '--sidebar-ring': '142 71% 55%',
  },
  sunset: {
    '--background': '15 25% 10%',
    '--foreground': '30 20% 95%',
    '--card': '15 25% 14%',
    '--card-foreground': '30 20% 95%',
    '--popover': '15 25% 10%',
    '--popover-foreground': '30 20% 95%',
    '--primary': '25 95% 53%',
    '--primary-foreground': '15 25% 10%',
    '--secondary': '38 92% 50%',
    '--secondary-foreground': '15 25% 10%',
    '--muted': '15 25% 18%',
    '--muted-foreground': '30 15% 60%',
    '--accent': '25 80% 60%',
    '--accent-foreground': '15 25% 10%',
    '--destructive': '0 62.8% 50.6%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '15 25% 22%',
    '--input': '15 25% 22%',
    '--ring': '25 95% 53%',
    '--sidebar-background': '15 25% 8%',
    '--sidebar-foreground': '30 15% 90%',
    '--sidebar-primary': '25 95% 53%',
    '--sidebar-primary-foreground': '15 25% 10%',
    '--sidebar-accent': '15 25% 16%',
    '--sidebar-accent-foreground': '30 15% 90%',
    '--sidebar-border': '15 25% 20%',
    '--sidebar-ring': '25 80% 60%',
  },
  ocean: {
    '--background': '200 50% 8%',
    '--foreground': '190 20% 95%',
    '--card': '200 50% 12%',
    '--card-foreground': '190 20% 95%',
    '--popover': '200 50% 8%',
    '--popover-foreground': '190 20% 95%',
    '--primary': '189 94% 43%',
    '--primary-foreground': '200 50% 8%',
    '--secondary': '173 80% 40%',
    '--secondary-foreground': '200 50% 8%',
    '--muted': '200 50% 15%',
    '--muted-foreground': '190 15% 60%',
    '--accent': '189 70% 55%',
    '--accent-foreground': '200 50% 8%',
    '--destructive': '0 62.8% 50.6%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '200 50% 18%',
    '--input': '200 50% 18%',
    '--ring': '189 94% 43%',
    '--sidebar-background': '200 50% 6%',
    '--sidebar-foreground': '190 15% 90%',
    '--sidebar-primary': '189 94% 43%',
    '--sidebar-primary-foreground': '200 50% 8%',
    '--sidebar-accent': '200 50% 14%',
    '--sidebar-accent-foreground': '190 15% 90%',
    '--sidebar-border': '200 50% 16%',
    '--sidebar-ring': '189 70% 55%',
  },
  rose: {
    '--background': '340 25% 10%',
    '--foreground': '330 15% 95%',
    '--card': '340 25% 14%',
    '--card-foreground': '330 15% 95%',
    '--popover': '340 25% 10%',
    '--popover-foreground': '330 15% 95%',
    '--primary': '330 81% 60%',
    '--primary-foreground': '340 25% 10%',
    '--secondary': '340 75% 50%',
    '--secondary-foreground': '330 15% 95%',
    '--muted': '340 25% 18%',
    '--muted-foreground': '330 10% 60%',
    '--accent': '330 65% 70%',
    '--accent-foreground': '340 25% 10%',
    '--destructive': '0 62.8% 50.6%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '340 25% 22%',
    '--input': '340 25% 22%',
    '--ring': '330 81% 60%',
    '--sidebar-background': '340 25% 8%',
    '--sidebar-foreground': '330 10% 90%',
    '--sidebar-primary': '330 81% 60%',
    '--sidebar-primary-foreground': '340 25% 10%',
    '--sidebar-accent': '340 25% 16%',
    '--sidebar-accent-foreground': '330 10% 90%',
    '--sidebar-border': '340 25% 20%',
    '--sidebar-ring': '330 65% 70%',
  },
  light: {
    '--background': '0 0% 100%',
    '--foreground': '222.2 84% 4.9%',
    '--card': '0 0% 100%',
    '--card-foreground': '222.2 84% 4.9%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '222.2 84% 4.9%',
    '--primary': '262 47% 55%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '187 48% 48%',
    '--secondary-foreground': '222.2 47.4% 11.2%',
    '--muted': '210 40% 96.1%',
    '--muted-foreground': '215.4 16.3% 46.9%',
    '--accent': '261 63% 75%',
    '--accent-foreground': '222.2 47.4% 11.2%',
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '214.3 31.8% 91.4%',
    '--input': '214.3 31.8% 91.4%',
    '--ring': '262 47% 55%',
    '--sidebar-background': '240 5% 96%',
    '--sidebar-foreground': '240 5.3% 20%',
    '--sidebar-primary': '262 47% 55%',
    '--sidebar-primary-foreground': '0 0% 98%',
    '--sidebar-accent': '240 5% 90%',
    '--sidebar-accent-foreground': '240 5.9% 20%',
    '--sidebar-border': '240 5% 85%',
    '--sidebar-ring': '262 47% 55%',
  },
};

export const useTheme = () => {
  const { profile } = useAuthContext();
  
  useEffect(() => {
    const theme = profile?.theme || 'dark';
    const root = document.documentElement;
    
    // Handle system theme
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? 'dark' : 'light';
      applyTheme(root, systemTheme);
      
      // Add listener for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        applyTheme(root, e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(root, theme);
    }
  }, [profile?.theme]);
};

const applyTheme = (root: HTMLElement, theme: string) => {
  const styles = themeStyles[theme] || themeStyles.dark;
  
  // Apply dark/light class for Tailwind
  if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
  
  // Apply all CSS variables
  Object.entries(styles).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};
