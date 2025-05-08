
import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  associationName: string;
  setAssociationName: (name: string) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  logoFile: File | null;
  setLogoFile: (file: File | null) => void;
  logoPreview: string;
  setLogoPreview: (preview: string) => void;
  saveSettings: () => void;
}

const defaultSettings = {
  associationName: 'NivariaCSC Manager',
  primaryColor: '#15803d', // Green color
  logoUrl: '',
  logoPreview: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [associationName, setAssociationName] = useState(defaultSettings.associationName);
  const [primaryColor, setPrimaryColor] = useState(defaultSettings.primaryColor);
  const [logoUrl, setLogoUrl] = useState(defaultSettings.logoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(defaultSettings.logoPreview);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('nivaria-settings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setAssociationName(parsedSettings.associationName || defaultSettings.associationName);
      setPrimaryColor(parsedSettings.primaryColor || defaultSettings.primaryColor);
      setLogoUrl(parsedSettings.logoUrl || defaultSettings.logoUrl);
      
      // Load logo preview if available
      if (parsedSettings.logoPreview) {
        setLogoPreview(parsedSettings.logoPreview);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    const settingsToSave = {
      associationName,
      primaryColor,
      logoUrl,
      logoPreview
    };
    localStorage.setItem('nivaria-settings', JSON.stringify(settingsToSave));
  };

  return (
    <SettingsContext.Provider
      value={{
        associationName,
        setAssociationName,
        primaryColor,
        setPrimaryColor,
        logoUrl,
        setLogoUrl,
        logoFile,
        setLogoFile,
        logoPreview,
        setLogoPreview,
        saveSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
