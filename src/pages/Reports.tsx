
import { useState } from 'react';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Download, TrendingUp, BanknoteIcon, ArrowDownIcon, ArrowUpIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

type DateRange = {
  from: Date;
  to: Date;
};

type ReportPeriod = '7days' | '30days' | '90days' | 'custom';

const Reports = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('30days');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const generateReport = async () => {
    setIsLoading(true);
    
    try {
      // Determine date range based on selected period
      let fromDate: Date;
      const toDate = new Date(); // Today
      
      switch (selectedPeriod) {
        case '7days':
          fromDate = subDays(toDate, 7);
          break;
        case '30days':
          fromDate = subDays(toDate, 30);
          break;
        case '90days':
          fromDate = subDays(toDate, 90);
          break;
        case 'custom':
          fromDate = dateRange.from;
          break;
        default:
          fromDate = subDays(toDate, 30);
      }
      
      // Get all transactions in the date range
      const allTransactions = await db.cashTransactions.toArray();
      const transactions = allTransactions.filter(t => {
        const date = new Date(t.createdAt);
        return isWithinInterval(date, { 
          start: startOfDay(fromDate),
          end: endOfDay(selectedPeriod === 'custom' ? dateRange.to : toDate) 
        });
      });
      
      // Get all dispensary records in the date range
      const allDispensary = await db.dispensary.toArray();
      const dispensaryRecords = allDispensary.filter(d => {
        const date = new Date(d.createdAt);
        return isWithinInterval(date, { 
          start: startOfDay(fromDate),
          end: endOfDay(selectedPeriod === 'custom' ? dateRange.to : toDate) 
        });
      });

      // Get products for cost calculation
      const products = await db.products.toArray();
      const productMap = products.reduce((map, product) => {
        if (product.id) {
          map[product.id] = product;
        }
        return map;
      }, {} as Record<number, typeof products[0]>);
      
      // Calculate report data
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate dispensary income and cost
      let dispensaryIncome = 0;
      let dispensaryCost = 0;
      
      for (const record of dispensaryRecords) {
        dispensaryIncome += record.price;
        
        // Calculate cost if product data is available
        if (record.productId && productMap[record.productId]) {
          const product = productMap[record.productId];
          const costPerGram = product.costPrice;
          dispensaryCost += costPerGram * record.quantity;
        }
      }
      
      // Payment method breakdown
      const cashIncome = transactions
        .filter(t => t.type === 'income' && t.paymentMethod === 'cash')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const bizumIncome = transactions
        .filter(t => t.type === 'income' && t.paymentMethod === 'bizum')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const walletIncome = transactions
        .filter(t => t.type === 'income' && t.paymentMethod === 'wallet')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Daily breakdown of income and expenses
      const dailyData: Record<string, { date: string, income: number, expense: number }> = {};
      
      transactions.forEach(transaction => {
        const dateStr = format(new Date(transaction.createdAt), 'yyyy-MM-dd');
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {
            date: format(new Date(transaction.createdAt), 'dd/MM/yyyy'),
            income: 0,
            expense: 0
          };
        }
        
        if (transaction.type === 'income') {
          dailyData[dateStr].income += transaction.amount;
        } else {
          dailyData[dateStr].expense += transaction.amount;
        }
      });
      
      // Prepare final report data
      setReportData({
        totalIncome: income,
        totalExpenses: expenses,
        netProfit: income - expenses,
        grossProfit: dispensaryIncome - dispensaryCost,
        dispensaryIncome,
        dispensaryCost,
        paymentMethods: {
          cash: cashIncome,
          bizum: bizumIncome,
          wallet: walletIncome
        },
        dailyBreakdown: Object.values(dailyData).sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }),
        transactions,
        dispensaryRecords,
        dateRange: {
          from: fromDate,
          to: selectedPeriod === 'custom' ? dateRange.to : toDate
        }
      });
      
      toast({
        title: "Informe generado",
        description: `Datos del ${format(fromDate, 'dd/MM/yyyy')} al ${format(selectedPeriod === 'custom' ? dateRange.to : toDate, 'dd/MM/yyyy')}`
      });
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo generar el informe'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportReport = () => {
    if (!reportData) return;
    
    try {
      // Create CSV content
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Add header
      csvContent += `Informe del ${format(reportData.dateRange.from, 'dd/MM/yyyy')} al ${format(reportData.dateRange.to, 'dd/MM/yyyy')}\n\n`;
      
      // Add summary section
      csvContent += 'Resumen\n';
      csvContent += `Ingresos totales,${reportData.totalIncome.toFixed(2)}€\n`;
      csvContent += `Gastos totales,${reportData.totalExpenses.toFixed(2)}€\n`;
      csvContent += `Beneficio neto,${reportData.netProfit.toFixed(2)}€\n`;
      csvContent += `Beneficio bruto dispensario,${reportData.grossProfit.toFixed(2)}€\n\n`;
      
      // Add payment methods
      csvContent += 'Métodos de pago\n';
      csvContent += `Efectivo,${reportData.paymentMethods.cash.toFixed(2)}€\n`;
      csvContent += `Bizum,${reportData.paymentMethods.bizum.toFixed(2)}€\n`;
      csvContent += `Monedero,${reportData.paymentMethods.wallet.toFixed(2)}€\n\n`;
      
      // Add daily breakdown
      csvContent += 'Desglose diario\n';
      csvContent += 'Fecha,Ingresos,Gastos\n';
      reportData.dailyBreakdown.forEach((day: any) => {
        csvContent += `${day.date},${day.income.toFixed(2)}€,${day.expense.toFixed(2)}€\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `informe_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Informe exportado",
        description: "El informe ha sido exportado correctamente"
      });
      
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo exportar el informe'
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Informes</h1>
        {reportData && (
          <Button onClick={exportReport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Generar informe</CardTitle>
          <CardDescription>
            Selecciona el período para generar un informe detallado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2 flex-grow">
                <span className="text-sm font-medium">Período</span>
                <div className="flex">
                  <Button
                    variant={selectedPeriod === '7days' ? 'default' : 'outline'}
                    className="rounded-r-none flex-1"
                    onClick={() => setSelectedPeriod('7days')}
                  >
                    7 días
                  </Button>
                  <Button
                    variant={selectedPeriod === '30days' ? 'default' : 'outline'}
                    className="rounded-none flex-1"
                    onClick={() => setSelectedPeriod('30days')}
                  >
                    30 días
                  </Button>
                  <Button
                    variant={selectedPeriod === '90days' ? 'default' : 'outline'}
                    className="rounded-l-none flex-1"
                    onClick={() => setSelectedPeriod('90days')}
                  >
                    90 días
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Personalizado</span>
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                        onClick={() => setSelectedPeriod('custom')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedPeriod === 'custom' ? (
                          <>
                            {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                          </>
                        ) : (
                          <span>Seleccionar fechas</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setDateRange(range as DateRange);
                          }
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={generateReport} 
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-current mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generar informe
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {reportData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ingresos totales
                </CardTitle>
                <ArrowUpIcon className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reportData.totalIncome.toFixed(2)}€
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gastos totales
                </CardTitle>
                <ArrowDownIcon className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {reportData.totalExpenses.toFixed(2)}€
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Beneficio neto
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {reportData.netProfit.toFixed(2)}€
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Beneficio dispensario
                </CardTitle>
                <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {reportData.grossProfit.toFixed(2)}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  (Ingresos - Costo de productos)
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métodos de pago</CardTitle>
              <CardDescription>
                Desglose de ingresos por método de pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Efectivo</span>
                  <span className="font-medium">{reportData.paymentMethods.cash.toFixed(2)}€</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bizum</span>
                  <span className="font-medium">{reportData.paymentMethods.bizum.toFixed(2)}€</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Monedero</span>
                  <span className="font-medium">{reportData.paymentMethods.wallet.toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="daily">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Desglose diario</TabsTrigger>
              <TabsTrigger value="transactions">Transacciones</TabsTrigger>
              <TabsTrigger value="dispensary">Dispensario</TabsTrigger>
            </TabsList>
            
            <TabsContent value="daily">
              <Card>
                <CardHeader>
                  <CardTitle>Desglose diario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Ingresos</TableHead>
                          <TableHead>Gastos</TableHead>
                          <TableHead>Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.dailyBreakdown.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                              No hay datos disponibles para el período seleccionado
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData.dailyBreakdown.map((day: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{day.date}</TableCell>
                              <TableCell className="text-green-600">+{day.income.toFixed(2)}€</TableCell>
                              <TableCell className="text-red-600">-{day.expense.toFixed(2)}€</TableCell>
                              <TableCell className={day.income - day.expense >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {(day.income - day.expense).toFixed(2)}€
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Transacciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.transactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No hay transacciones disponibles para el período seleccionado
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData.transactions.map((transaction: any) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    transaction.type === 'income'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                                </span>
                              </TableCell>
                              <TableCell>{transaction.concept}</TableCell>
                              <TableCell>
                                {transaction.paymentMethod === 'cash' && 'Efectivo'}
                                {transaction.paymentMethod === 'bizum' && 'Bizum'}
                                {transaction.paymentMethod === 'wallet' && 'Monedero'}
                              </TableCell>
                              <TableCell className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}€
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="dispensary">
              <Card>
                <CardHeader>
                  <CardTitle>Dispensario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad (g)</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.dispensaryRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No hay dispensaciones disponibles para el período seleccionado
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData.dispensaryRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell>
                                {format(new Date(record.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </TableCell>
                              <TableCell>{record.productName || `Producto #${record.productId}`}</TableCell>
                              <TableCell>{record.quantity}</TableCell>
                              <TableCell>
                                {record.paymentMethod === 'cash' && 'Efectivo'}
                                {record.paymentMethod === 'bizum' && 'Bizum'}
                                {record.paymentMethod === 'wallet' && 'Monedero'}
                              </TableCell>
                              <TableCell className="text-green-600">
                                +{record.price.toFixed(2)}€
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Reports;
