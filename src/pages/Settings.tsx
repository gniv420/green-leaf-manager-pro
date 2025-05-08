import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/db';
import { Download, Database, Upload, FileDown, Palette, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/contexts/SettingsContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const Settings = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleExportData = async () => {
    setIsExporting(true);
    
    try {
      // Collect all data from the database
      const members = await db.members.toArray();
      const users = await db.users.toArray();
      const documents = await db.documents.toArray();
      
      // Create the export object
      const exportData = {
        members,
        users,
        documents,
        exportDate: new Date(),
        version: '1.0'
      };
      
      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `greenleaf_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: 'Exportación completada',
        description: 'Los datos se han exportado correctamente'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron exportar los datos'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSQLite = async () => {
    setIsExportingSql(true);
    
    try {
      // Get SQL export script
      const sqlScript = await db.exportAsSQLite();
      
      // Create blob and download
      const blob = new Blob([sqlScript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `greenleaf_sqlite_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: 'Exportación SQL completada',
        description: 'El script SQL se ha generado correctamente'
      });
    } catch (error) {
      console.error('Error exporting SQL data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo generar el script SQL'
      });
    } finally {
      setIsExportingSql(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor selecciona un archivo de importación'
      });
      return;
    }
    
    setIsImporting(true);
    
    try {
      // Read the file
      const fileContent = await importFile.text();
      const importData = JSON.parse(fileContent);
      
      // Validate the import data
      if (!importData.members || !importData.users || !importData.documents) {
        throw new Error('Formato de archivo inválido');
      }
      
      // Clear existing data
      await db.members.clear();
      await db.users.clear();
      await db.documents.clear();
      
      // Import members
      for (const member of importData.members) {
        await db.members.add({
          ...member,
          createdAt: new Date(member.createdAt),
          updatedAt: new Date(member.updatedAt),
          dob: new Date(member.dob)
        });
      }
      
      // Import users
      for (const user of importData.users) {
        await db.users.add({
          ...user,
          createdAt: new Date(user.createdAt)
        });
      }
      
      // Import documents
      for (const document of importData.documents) {
        await db.documents.add({
          ...document,
          createdAt: new Date(document.createdAt)
        });
      }
      
      toast({
        title: 'Importación completada',
        description: 'Los datos se han importado correctamente'
      });
      
      // Reset the import file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setImportFile(null);
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error('Error importing data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron importar los datos. Verifica el formato del archivo.'
      });
    } finally {
      setIsImporting(false);
    }
  };

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

      <Tabs defaultValue="data" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="data">Datos</TabsTrigger>
          <TabsTrigger value="customization">Personalización</TabsTrigger>
        </TabsList>
        
        <TabsContent value="data">
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle>Administración de datos</CardTitle>
              <CardDescription>
                Opciones para exportar e importar datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Exportar datos (JSON)</CardTitle>
                    <CardDescription>
                      Descarga una copia de respaldo de todos los datos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleExportData} 
                      disabled={isExporting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isExporting ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                          Exportando...
                        </div>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Exportar JSON
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Exportar datos (SQL)</CardTitle>
                    <CardDescription>
                      Genera un script SQL para migración a SQLite
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleExportSQLite} 
                      disabled={isExportingSql}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isExportingSql ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                          Exportando SQL...
                        </div>
                      ) : (
                        <>
                          <FileDown className="mr-2 h-4 w-4" />
                          Exportar SQL
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Importar datos</CardTitle>
                  <CardDescription>
                    Restaura datos desde un archivo de respaldo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setIsImportDialogOpen(true)}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </Button>
                </CardContent>
              </Card>
              
              <div className="mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Información de base de datos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center">
                      <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>
                        Base de datos IndexedDB (almacenamiento local en navegador)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Los datos se almacenan localmente en el navegador. Para migrar a SQLite en tu Raspberry Pi,
                      usa la opción "Exportar SQL" y ejecuta el script en SQLite.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="customization">
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
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar datos</DialogTitle>
            <DialogDescription>
              Esta acción reemplazará todos los datos existentes. Asegúrate de hacer una copia de seguridad antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="importFile" className="text-sm font-medium leading-none">
                Archivo de importación
              </label>
              <input
                id="importFile"
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(false)} 
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleImportData} 
              disabled={!importFile || isImporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                  Importando...
                </div>
              ) : (
                'Importar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
