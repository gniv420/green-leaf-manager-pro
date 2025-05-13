
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/db';
import { Download, Database, Upload, FileDown, Palette, Image, Server } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';

const Settings = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSqliteImportDialogOpen, setIsSqliteImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [sqliteImportFile, setSqliteImportFile] = useState<File | null>(null);
  const [useSqliteBackend, setUseSqliteBackend] = useState(false);
  const [sqliteServerUrl, setSqliteServerUrl] = useState('http://gniv.zapto.org/api');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sqliteFileInputRef = useRef<HTMLInputElement>(null);
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
      const products = await db.products.toArray();
      const dispensary = await db.dispensary.toArray();
      const cashRegisters = await db.cashRegisters.toArray();
      const cashTransactions = await db.cashTransactions.toArray();
      const memberTransactions = await db.memberTransactions.toArray();
      
      // Create the export object
      const exportData = {
        members,
        users,
        documents,
        products,
        dispensary,
        cashRegisters,
        cashTransactions,
        memberTransactions,
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
      a.download = `nivaria_export_${new Date().toISOString().split('T')[0]}.json`;
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
      // Get all data from database
      const members = await db.members.toArray();
      const users = await db.users.toArray();
      const documents = await db.documents.toArray();
      const products = await db.products.toArray();
      const dispensary = await db.dispensary.toArray();
      const cashRegisters = await db.cashRegisters.toArray();
      const cashTransactions = await db.cashTransactions.toArray();
      const memberTransactions = await db.memberTransactions.toArray();
      
      // Generate SQL script
      let sqlScript = `-- Cannabis Club Manager SQLite Export\n`;
      sqlScript += `-- Generated: ${new Date().toISOString()}\n\n`;
      
      // Create tables
      sqlScript += `-- Create tables\n`;
      sqlScript += `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        fullName TEXT NOT NULL,
        isAdmin INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        lastLogin TEXT
      );\n\n`;
      
      sqlScript += `CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memberCode TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        dni TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        dob TEXT NOT NULL,
        address TEXT,
        city TEXT,
        postalCode TEXT,
        joinDate TEXT NOT NULL,
        consumptionGrams REAL NOT NULL,
        notes TEXT,
        status TEXT NOT NULL,
        balance REAL,
        sponsorId INTEGER,
        rfidCode TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );\n\n`;
      
      sqlScript += `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        price REAL NOT NULL,
        costPrice REAL,
        stockGrams REAL NOT NULL,
        isVisible INTEGER,
        image TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );\n\n`;
      
      sqlScript += `CREATE TABLE IF NOT EXISTS dispensary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memberId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        notes TEXT,
        userId INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      );\n\n`;
      
      sqlScript += `CREATE TABLE IF NOT EXISTS cash_registers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        openDate TEXT NOT NULL,
        closeDate TEXT,
        initialBalance REAL NOT NULL,
        finalBalance REAL,
        status TEXT NOT NULL,
        openingAmount REAL NOT NULL,
        closingAmount REAL,
        userId INTEGER NOT NULL,
        notes TEXT,
        openedAt TEXT NOT NULL,
        closedAt TEXT
      );\n\n`;
      
      sqlScript += `CREATE TABLE IF NOT EXISTS cash_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cashRegisterId INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        concept TEXT NOT NULL,
        notes TEXT,
        userId INTEGER NOT NULL,
        paymentMethod TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );\n\n`;
      
      sqlScript += `CREATE TABLE IF NOT EXISTS member_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memberId INTEGER NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        notes TEXT,
        userId INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      );\n\n`;
      
      sqlScript += `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memberId INTEGER NOT NULL,
        type TEXT NOT NULL,
        uploadDate TEXT NOT NULL,
        name TEXT NOT NULL,
        fileName TEXT NOT NULL,
        contentType TEXT NOT NULL,
        size INTEGER NOT NULL,
        filePath TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );\n\n`;
      
      // Insert users
      sqlScript += `-- Insert users\n`;
      for (const user of users) {
        sqlScript += `INSERT INTO users (id, username, password, fullName, isAdmin, createdAt${user.lastLogin ? ', lastLogin' : ''}) 
        VALUES (${user.id}, '${escapeSql(user.username)}', '${escapeSql(user.password)}', '${escapeSql(user.fullName)}', ${user.isAdmin ? 1 : 0}, '${new Date(user.createdAt).toISOString()}'${user.lastLogin ? `, '${new Date(user.lastLogin).toISOString()}'` : ''});\n`;
      }
      sqlScript += `\n`;
      
      // Insert members
      sqlScript += `-- Insert members\n`;
      for (const member of members) {
        sqlScript += `INSERT INTO members (
          id, memberCode, firstName, lastName, dni, email, phone, dob, address, city, postalCode, 
          joinDate, consumptionGrams, notes, status, balance, sponsorId, rfidCode, createdAt, updatedAt
        ) VALUES (
          ${member.id}, '${escapeSql(member.memberCode)}', '${escapeSql(member.firstName)}', '${escapeSql(member.lastName)}', 
          '${escapeSql(member.dni)}', ${member.email ? `'${escapeSql(member.email)}'` : 'NULL'}, '${escapeSql(member.phone)}', 
          '${new Date(member.dob).toISOString()}', ${member.address ? `'${escapeSql(member.address)}'` : 'NULL'}, 
          ${member.city ? `'${escapeSql(member.city)}'` : 'NULL'}, ${member.postalCode ? `'${escapeSql(member.postalCode)}'` : 'NULL'}, 
          '${new Date(member.joinDate).toISOString()}', ${member.consumptionGrams}, ${member.notes ? `'${escapeSql(member.notes)}'` : 'NULL'}, 
          '${escapeSql(member.status)}', ${member.balance || 0}, ${member.sponsorId ? member.sponsorId : 'NULL'}, 
          ${member.rfidCode ? `'${escapeSql(member.rfidCode)}'` : 'NULL'}, '${new Date(member.createdAt).toISOString()}', '${new Date(member.updatedAt).toISOString()}'
        );\n`;
      }
      sqlScript += `\n`;
      
      // Insert products
      sqlScript += `-- Insert products\n`;
      for (const product of products) {
        sqlScript += `INSERT INTO products (
          id, name, description, category, type, price, costPrice, stockGrams, isVisible, image, notes, createdAt, updatedAt
        ) VALUES (
          ${product.id}, '${escapeSql(product.name)}', ${product.description ? `'${escapeSql(product.description)}'` : 'NULL'}, 
          '${escapeSql(product.category)}', '${escapeSql(product.type)}', ${product.price}, ${product.costPrice || 'NULL'}, 
          ${product.stockGrams}, ${product.isVisible ? 1 : 0}, ${product.image ? `'${escapeSql(product.image)}'` : 'NULL'}, 
          ${product.notes ? `'${escapeSql(product.notes)}'` : 'NULL'}, '${new Date(product.createdAt).toISOString()}', '${new Date(product.updatedAt).toISOString()}'
        );\n`;
      }
      sqlScript += `\n`;
      
      // Insert dispensary records
      sqlScript += `-- Insert dispensary records\n`;
      for (const record of dispensary) {
        sqlScript += `INSERT INTO dispensary (
          id, memberId, productId, quantity, price, paymentMethod, notes, userId, createdAt
        ) VALUES (
          ${record.id}, ${record.memberId}, ${record.productId}, ${record.quantity}, ${record.price}, 
          '${escapeSql(record.paymentMethod)}', ${record.notes ? `'${escapeSql(record.notes)}'` : 'NULL'}, 
          ${record.userId}, '${new Date(record.createdAt).toISOString()}'
        );\n`;
      }
      sqlScript += `\n`;
      
      // Insert cash registers
      sqlScript += `-- Insert cash registers\n`;
      for (const register of cashRegisters) {
        sqlScript += `INSERT INTO cash_registers (
          id, openDate, closeDate, initialBalance, finalBalance, status, openingAmount, closingAmount, 
          userId, notes, openedAt, closedAt
        ) VALUES (
          ${register.id}, '${new Date(register.openDate).toISOString()}', ${register.closeDate ? `'${new Date(register.closeDate).toISOString()}'` : 'NULL'}, 
          ${register.initialBalance}, ${register.finalBalance || 'NULL'}, '${escapeSql(register.status)}', 
          ${register.openingAmount}, ${register.closingAmount || 'NULL'}, ${register.userId}, 
          ${register.notes ? `'${escapeSql(register.notes)}'` : 'NULL'}, '${new Date(register.openedAt).toISOString()}', 
          ${register.closedAt ? `'${new Date(register.closedAt).toISOString()}'` : 'NULL'}
        );\n`;
      }
      sqlScript += `\n`;
      
      // Insert cash transactions
      sqlScript += `-- Insert cash transactions\n`;
      for (const transaction of cashTransactions) {
        sqlScript += `INSERT INTO cash_transactions (
          id, cashRegisterId, type, amount, concept, notes, userId, paymentMethod, createdAt
        ) VALUES (
          ${transaction.id}, ${transaction.cashRegisterId}, '${escapeSql(transaction.type)}', ${transaction.amount}, 
          '${escapeSql(transaction.concept)}', ${transaction.notes ? `'${escapeSql(transaction.notes)}'` : 'NULL'}, 
          ${transaction.userId}, '${escapeSql(transaction.paymentMethod)}', '${new Date(transaction.createdAt).toISOString()}'
        );\n`;
      }
      sqlScript += `\n`;
      
      // Insert member transactions
      sqlScript += `-- Insert member transactions\n`;
      for (const transaction of memberTransactions) {
        sqlScript += `INSERT INTO member_transactions (
          id, memberId, amount, type, notes, userId, createdAt
        ) VALUES (
          ${transaction.id}, ${transaction.memberId}, ${transaction.amount}, '${escapeSql(transaction.type)}', 
          ${transaction.notes ? `'${escapeSql(transaction.notes)}'` : 'NULL'}, ${transaction.userId}, 
          '${new Date(transaction.createdAt).toISOString()}'
        );\n`;
      }
      sqlScript += `\n`;
      
      // Insert documents (without binary data)
      sqlScript += `-- Insert documents (reference only, no binary data)\n`;
      for (const doc of documents) {
        sqlScript += `INSERT INTO documents (
          id, memberId, type, uploadDate, name, fileName, contentType, size, filePath, createdAt
        ) VALUES (
          ${doc.id}, ${doc.memberId}, '${escapeSql(doc.type)}', '${new Date(doc.uploadDate).toISOString()}', 
          '${escapeSql(doc.name)}', '${escapeSql(doc.fileName)}', '${escapeSql(doc.contentType)}', 
          ${doc.size}, '/documents/${doc.memberId}/${doc.id}/${escapeSql(doc.fileName)}', '${new Date(doc.createdAt).toISOString()}'
        );\n`;
      }
      
      // Create blob and download
      const blob = new Blob([sqlScript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `club_sqlite_export_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: 'Exportación SQL completada',
        description: 'El script SQL se ha generado correctamente para usar en SQLite'
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

  // Escape function for SQL
  const escapeSql = (str: string): string => {
    if (!str) return '';
    return str.replace(/'/g, "''");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };
  
  const handleSqliteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSqliteImportFile(e.target.files[0]);
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
      if (!importData.members || !importData.users) {
        throw new Error('Formato de archivo inválido');
      }
      
      // Clear existing data
      await db.members.clear();
      await db.users.clear();
      
      // Clear other tables if they exist in import data
      if (importData.documents) await db.documents.clear();
      if (importData.products) await db.products.clear();
      if (importData.dispensary) await db.dispensary.clear();
      if (importData.cashRegisters) await db.cashRegisters.clear();
      if (importData.cashTransactions) await db.cashTransactions.clear();
      if (importData.memberTransactions) await db.memberTransactions.clear();
      
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
      
      // Import other data if available
      if (importData.documents) {
        for (const document of importData.documents) {
          await db.documents.add({
            ...document,
            createdAt: new Date(document.createdAt)
          });
        }
      }
      
      if (importData.products) {
        for (const product of importData.products) {
          await db.products.add({
            ...product,
            createdAt: new Date(product.createdAt),
            updatedAt: new Date(product.updatedAt)
          });
        }
      }
      
      if (importData.dispensary) {
        for (const item of importData.dispensary) {
          await db.dispensary.add({
            ...item,
            createdAt: new Date(item.createdAt)
          });
        }
      }
      
      if (importData.cashRegisters) {
        for (const register of importData.cashRegisters) {
          await db.cashRegisters.add({
            ...register,
            openDate: new Date(register.openDate),
            closeDate: register.closeDate ? new Date(register.closeDate) : undefined,
            openedAt: new Date(register.openedAt),
            closedAt: register.closedAt ? new Date(register.closedAt) : undefined
          });
        }
      }
      
      if (importData.cashTransactions) {
        for (const transaction of importData.cashTransactions) {
          await db.cashTransactions.add({
            ...transaction,
            createdAt: new Date(transaction.createdAt)
          });
        }
      }
      
      if (importData.memberTransactions) {
        for (const transaction of importData.memberTransactions) {
          await db.memberTransactions.add({
            ...transaction,
            createdAt: new Date(transaction.createdAt)
          });
        }
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
  
  const handleImportSqlite = async () => {
    setIsSqliteImportDialogOpen(false);
    
    if (!sqliteImportFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor selecciona un archivo SQL para importar'
      });
      return;
    }
    
    if (!useSqliteBackend) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes activar la conexión al backend SQLite primero'
      });
      return;
    }
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('sqlFile', sqliteImportFile);
      
      // Send to backend
      const response = await fetch(`${sqliteServerUrl}/import`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      toast({
        title: 'Importación SQLite completada',
        description: 'El archivo SQL ha sido enviado al servidor y aplicado correctamente'
      });
      
      // Reset file input
      if (sqliteFileInputRef.current) {
        sqliteFileInputRef.current.value = '';
      }
      setSqliteImportFile(null);
    } catch (error) {
      console.error('Error importing SQLite file:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `No se pudo importar el archivo SQLite: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
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
  
  const handleToggleSqliteBackend = () => {
    setUseSqliteBackend(!useSqliteBackend);
    
    toast({
      title: useSqliteBackend ? 'Modo local activado' : 'Modo SQLite activado',
      description: useSqliteBackend 
        ? 'Usando base de datos local (IndexedDB)' 
        : 'Conectado al backend SQLite en Raspberry Pi'
    });
    
    // In a real implementation, this would change the data source
    // and sync with the server
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>

      <Tabs defaultValue="data" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="data">Datos</TabsTrigger>
          <TabsTrigger value="backend">Backend</TabsTrigger>
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
                    <CardTitle className="text-lg">Exportar datos (SQLite)</CardTitle>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Importar datos (JSON)</CardTitle>
                    <CardDescription>
                      Restaura datos desde un archivo de respaldo JSON
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => setIsImportDialogOpen(true)}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Importar JSON
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Importar datos (SQLite)</CardTitle>
                    <CardDescription>
                      Envía un script SQL al backend SQLite
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => setIsSqliteImportDialogOpen(true)}
                      className="w-full"
                      disabled={!useSqliteBackend}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Importar SQL
                    </Button>
                    {!useSqliteBackend && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Activa la conexión al backend SQLite en la pestaña "Backend" para usar esta función
                      </p>
                    )}
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
                        {useSqliteBackend 
                          ? "Usando SQLite (Raspberry Pi)" 
                          : "Usando IndexedDB (almacenamiento local en navegador)"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {useSqliteBackend 
                        ? "Conectado al backend SQLite en Raspberry Pi. Los datos se almacenan de forma centralizada."
                        : "Los datos se almacenan localmente en el navegador. Para migrar a SQLite en tu Raspberry Pi, usa la opción 'Exportar SQL' y ejecuta el script en SQLite."}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="backend">
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle>Configuración del Backend</CardTitle>
              <CardDescription>
                Configuración para la conexión con el backend SQLite en Raspberry Pi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="sqliteMode" 
                  checked={useSqliteBackend}
                  onCheckedChange={handleToggleSqliteBackend}
                />
                <Label htmlFor="sqliteMode" className="font-medium">
                  {useSqliteBackend ? "Usar backend SQLite (Raspberry Pi)" : "Usar almacenamiento local"}
                </Label>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="serverUrl">URL del servidor SQLite</Label>
                <Input
                  id="serverUrl"
                  value={sqliteServerUrl}
                  onChange={(e) => setSqliteServerUrl(e.target.value)}
                  placeholder="http://gniv.zapto.org/api"
                  disabled={!useSqliteBackend}
                />
                <p className="text-sm text-muted-foreground">
                  URL para conectar con el backend SQLite en Raspberry Pi
                </p>
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Información del Servidor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dirección IP:</span>
                      <span>192.168.1.173</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre DNS:</span>
                      <span>gniv.zapto.org</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <span className={useSqliteBackend ? "text-green-600" : "text-red-600"}>
                        {useSqliteBackend ? "Conectado" : "Desconectado"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    toast({
                      title: 'Configuración guardada',
                      description: 'La configuración del backend ha sido actualizada'
                    });
                  }}
                >
                  <Server className="mr-2 h-4 w-4" />
                  Guardar configuración del backend
                </Button>
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

      {/* Import JSON Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar datos JSON</DialogTitle>
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
      
      {/* Import SQLite Dialog */}
      <Dialog open={isSqliteImportDialogOpen} onOpenChange={setIsSqliteImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar script SQL</DialogTitle>
            <DialogDescription>
              Selecciona un archivo SQL para importar en el servidor SQLite. Esta acción ejecutará el script en el servidor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="sqliteFile" className="text-sm font-medium leading-none">
                Archivo SQL
              </label>
              <input
                id="sqliteFile"
                ref={sqliteFileInputRef}
                type="file"
                accept=".sql"
                onChange={handleSqliteFileChange}
                className="w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="rounded-md bg-amber-50 p-3 text-amber-800 text-sm">
              <p className="font-medium">Advertencia:</p>
              <p>Esta acción ejecutará comandos SQL en el servidor. Asegúrate de que el archivo sea seguro y provenga de una fuente confiable.</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSqliteImportDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleImportSqlite} 
              disabled={!sqliteImportFile}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Importar a SQLite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
