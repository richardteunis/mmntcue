import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

const themeStyles: Record<string, Record<string, string>> = {
  dark: {
    '--background': '261 13% 14%',
    '--foreground': '210 40% 98%',
    '--card': '261 13% 18%',
    '--card-foreground': '210 40% 98%',
    '--primary': '262 47% 55%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '187 48% 48%',
    '--muted': '261 13% 20%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '261 63% 75%',
    '--border': '261 13% 25%',
    '--sidebar-background': '263 28% 14%',
  },
  midnight: {
    '--background': '222 47% 11%',
    '--foreground': '210 40% 98%',
    '--card': '222 47% 15%',
    '--card-foreground': '210 40% 98%',
    '--primary': '217 91% 60%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '199 89% 48%',
    '--muted': '222 47% 18%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '217 91% 70%',
    '--border': '222 47% 22%',
    '--sidebar-background': '222 47% 9%',
  },
  forest: {
    '--background': '150 30% 11%',
    '--foreground': '210 40% 98%',
    '--card': '150 30% 15%',
    '--card-foreground': '210 40% 98%',
    '--primary': '142 71% 45%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '162 95% 35%',
    '--muted': '150 30% 18%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '142 71% 55%',
    '--border': '150 30% 22%',
    '--sidebar-background': '150 30% 9%',
  },
  sunset: {
    '--background': '0 20% 12%',
    '--foreground': '210 40% 98%',
    '--card': '0 20% 16%',
    '--card-foreground': '210 40% 98%',
    '--primary': '25 95% 53%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '38 92% 50%',
    '--muted': '0 20% 18%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '25 95% 63%',
    '--border': '0 20% 22%',
    '--sidebar-background': '0 20% 9%',
  },
  ocean: {
    '--background': '201 60% 10%',
    '--foreground': '210 40% 98%',
    '--card': '201 60% 14%',
    '--card-foreground': '210 40% 98%',
    '--primary': '189 94% 43%',
    '--primary-foreground': '201 60% 10%',
    '--secondary': '173 80% 40%',
    '--muted': '201 60% 16%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '189 94% 53%',
    '--border': '201 60% 20%',
    '--sidebar-background': '201 60% 8%',
  },
  rose: {
    '--background': '340 20% 12%',
    '--foreground': '210 40% 98%',
    '--card': '340 20% 16%',
    '--card-foreground': '210 40% 98%',
    '--primary': '330 81% 60%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '340 75% 55%',
    '--muted': '340 20% 18%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '330 81% 70%',
    '--border': '340 20% 22%',
    '--sidebar-background': '340 20% 9%',
  },
  light: {
    '--background': '0 0% 100%',
    '--foreground': '222.2 84% 4.9%',
    '--card': '0 0% 100%',
    '--card-foreground': '222.2 84% 4.9%',
    '--primary': '262 47% 55%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '187 48% 48%',
    '--muted': '210 40% 96.1%',
    '--muted-foreground': '215.4 16.3% 46.9%',
    '--accent': '261 63% 75%',
    '--border': '214.3 31.8% 91.4%',
    '--sidebar-background': '263 28% 20%',
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
  
  // Apply theme class
  if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
  
  // Apply CSS variables
  Object.entries(styles).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};
