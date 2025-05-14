
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/SettingsContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Palette, Image } from 'lucide-react';

const Settings = () => {
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const {
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
  } = useSettings();

  // State for customization settings
  const [tempAssociationName, setTempAssociationName] = useState(associationName);
  const [tempPrimaryColor, setTempPrimaryColor] = useState(primaryColor);
  const [tempLogoUrl, setTempLogoUrl] = useState(logoUrl);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Por favor selecciona una imagen válida'
        });
        return;
      }
      
      setLogoFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLogoPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
      
      // Clear the URL input since we're using a file now
      setTempLogoUrl('');
    }
  };

  const handleSaveCustomizations = () => {
    setAssociationName(tempAssociationName);
    setPrimaryColor(tempPrimaryColor);
    
    if (tempLogoUrl) {
      // If URL is provided, use that
      setLogoUrl(tempLogoUrl);
      setLogoPreview(''); // Clear any file preview
    } else if (logoPreview) {
      // If we have a file preview, use that
      setLogoUrl('');
    }
    
    saveSettings();
    
    toast({
      title: 'Configuración guardada',
      description: 'Los ajustes de personalización se han guardado correctamente'
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>

      <Card className="border-green-200">
        <CardHeader>
          <CardTitle>Personalización</CardTitle>
          <CardDescription>
            Personaliza la apariencia de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="associationName">Nombre de la asociación</Label>
            <Input
              id="associationName"
              value={tempAssociationName}
              onChange={(e) => setTempAssociationName(e.target.value)}
              placeholder="Nombre de tu asociación"
            />
            <p className="text-sm text-muted-foreground">
              Este nombre aparecerá en la barra lateral y otros elementos de la aplicación
            </p>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="primaryColor">Color principal</Label>
            <div className="flex items-center gap-4">
              <Input
                id="primaryColor"
                type="color"
                value={tempPrimaryColor}
                onChange={(e) => setTempPrimaryColor(e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={tempPrimaryColor}
                onChange={(e) => setTempPrimaryColor(e.target.value)}
                placeholder="#15803d"
                className="flex-1"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Este color se utilizará para los botones principales y elementos destacados
            </p>
          </div>
          
          <div className="space-y-3">
            <Label>Logotipo de la asociación</Label>
            
            {/* Logo preview */}
            {(logoPreview || tempLogoUrl) && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Vista previa:</p>
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={logoPreview || tempLogoUrl} 
                    alt="Logo preview" 
                  />
                  <AvatarFallback>Logo</AvatarFallback>
                </Avatar>
              </div>
            )}
            
            {/* File upload */}
            <div className="space-y-2">
              <Label htmlFor="logoFile">Subir logo desde el dispositivo</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="logoFile"
                  ref={logoFileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button 
                  onClick={() => logoFileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Image className="mr-2 h-4 w-4" />
                  Seleccionar imagen
                </Button>
              </div>
              {logoFile && (
                <p className="text-xs text-muted-foreground">
                  Archivo seleccionado: {logoFile.name}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Sube un logotipo desde tu dispositivo (formatos: JPG, PNG, SVG)
              </p>
            </div>
            
            {/* URL input as alternative */}
            <div className="space-y-2">
              <Label htmlFor="logoUrl">O usar URL del logotipo (alternativo)</Label>
              <Input
                id="logoUrl"
                value={tempLogoUrl}
                onChange={(e) => {
                  setTempLogoUrl(e.target.value);
                  if (e.target.value) {
                    // Clear file selection if URL is entered
                    setLogoFile(null);
                    setLogoPreview('');
                    if (logoFileInputRef.current) logoFileInputRef.current.value = '';
                  }
                }}
                placeholder="https://ejemplo.com/logo.png"
              />
              <p className="text-sm text-muted-foreground">
                Añade una URL para el logotipo de tu asociación
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleSaveCustomizations}
            className="w-full bg-green-600 hover:bg-green-700 mt-4"
          >
            <Palette className="mr-2 h-4 w-4" />
            Guardar personalización
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
