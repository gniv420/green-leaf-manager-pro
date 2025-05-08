
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, Search, Sun, Moon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from './ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useTheme } from '@/hooks/use-theme';
import { Switch } from './ui/switch';

interface MainHeaderProps {
  toggleSidebar: () => void;
  title?: string;
}

export function MainHeader({ toggleSidebar, title = 'Dashboard' }: MainHeaderProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchInput, setSearchInput] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);
  const { theme, toggleTheme } = useTheme();
  
  React.useEffect(() => {
    if (debouncedSearch) {
      navigate(`/members?search=${encodeURIComponent(debouncedSearch)}`);
    }
  }, [debouncedSearch, navigate]);
  
  return (
    <header className="h-[60px] border-b flex items-center justify-between px-4 sticky top-0 bg-background z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        {!showSearch && <h1 className="text-xl font-bold">{title}</h1>}
      </div>
      <div className="flex items-center gap-3">
        {showSearch ? (
          <div className="relative w-full max-w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar socios..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onBlur={() => {
                if (!searchInput) {
                  setShowSearch(false);
                }
              }}
            />
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
        
        {/* Dark mode toggle */}
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <Switch 
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            aria-label="Cambiar tema"
          />
          <Moon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
