
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/db';
import { Download, Database, Upload } from 'lucide-react';
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
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>

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
                <CardTitle className="text-lg">Exportar datos</CardTitle>
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
                      Exportar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

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
          </div>
          
          <div className="mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Información de base de datos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center">
                  <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>
                    Base de datos SQLite (IndexedDB) - Almacenamiento local en el navegador
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Los datos se almacenan localmente en el navegador. Para evitar pérdida de datos,
                  realiza exportaciones periódicas.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

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
