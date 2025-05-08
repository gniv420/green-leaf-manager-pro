
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useIsMobile } from '@/hooks/use-mobile';

interface ThemeSwitcherProps {
  className?: string;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  
  return (
    <Button 
      variant="ghost" 
      size={isMobile ? "icon" : "default"}
      onClick={toggleTheme}
      className={className}
      title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {theme === 'dark' ? (
        <>
          {!isMobile && "Modo claro"}
          <Sun className={isMobile ? "" : "ml-2"} size={isMobile ? 20 : 16} />
        </>
      ) : (
        <>
          {!isMobile && "Modo oscuro"}
          <Moon className={isMobile ? "" : "ml-2"} size={isMobile ? 20 : 16} />
        </>
      )}
    </Button>
  );
};

export default ThemeSwitcher;
