
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Tipo para los datos de transacciones
type TransactionData = {
  date: string;
  income: number;
  expense: number;
  balance: number;
};

export default function Reports() {
  // Estado para rango de fechas (por defecto últimos 30 días)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  // Estados para datos
  const [transactionData, setTransactionData] = useState<TransactionData[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Cargar datos cuando cambie el rango de fechas
  useEffect(() => {
    const loadReportData = async () => {
      if (!dateRange?.from || !dateRange?.to) return;
      
      setLoading(true);
      try {
        // Obtener todas las transacciones
        const cashRegisters = await db.getCashRegisters();
        
        // Filtrar por el rango de fechas seleccionado
        const filteredRegisters = cashRegisters.filter(register => {
          const registerDate = new Date(register.openDate);
          return dateRange.from && dateRange.to && 
            registerDate >= dateRange.from && 
            registerDate <= dateRange.to;
        });
        
        // Obtener transacciones para cada caja
        const allTransactions = [];
        for (const register of filteredRegisters) {
          if (register.id) {
            const transactions = await db.cashTransactions.where('cashRegisterId').equals(register.id).toArray();
            allTransactions.push(...transactions);
          }
        }
        
        // Agrupar transacciones por fecha
        const transactionsByDate = allTransactions.reduce((acc: Record<string, any>, transaction) => {
          const date = format(new Date(transaction.createdAt), 'yyyy-MM-dd');
          
          if (!acc[date]) {
            acc[date] = {
              date,
              income: 0,
              expense: 0,
              balance: 0
            };
          }
          
          if (transaction.type === 'income') {
            acc[date].income += transaction.amount;
          } else {
            acc[date].expense += transaction.amount;
          }
          
          acc[date].balance = acc[date].income - acc[date].expense;
          
          return acc;
        }, {});
        
        // Convertir a array ordenado por fecha
        const sortedTransactions = Object.values(transactionsByDate).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        setTransactionData(sortedTransactions as TransactionData[]);
        
        // Obtener datos de productos vendidos
        const dispensaryRecords = await db.getDispensaryRecords();
        const filteredDispensary = dispensaryRecords.filter(record => {
          const recordDate = new Date(record.createdAt);
          return dateRange.from && dateRange.to && 
            recordDate >= dateRange.from && 
            recordDate <= dateRange.to;
        });
        
        // Agrupar por producto
        const productSales: Record<number, { productId: number, name: string, quantity: number, revenue: number }> = {};
        
        for (const record of filteredDispensary) {
          // Obtener detalles del producto
          const product = await db.getProductById(record.productId);
          
          if (product) {
            if (!productSales[record.productId]) {
              productSales[record.productId] = {
                productId: record.productId,
                name: product.name,
                quantity: 0,
                revenue: 0
              };
            }
            
            productSales[record.productId].quantity += record.quantity;
            productSales[record.productId].revenue += record.price;
          }
        }
        
        // Convertir a array y ordenar por cantidad vendida
        const sortedProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);
        
        setProductData(sortedProducts);
      } catch (error) {
        console.error("Error loading report data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadReportData();
  }, [dateRange]);
  
  // Formatear para el botón de selección de fechas
  const formatDateRange = () => {
    if (!dateRange?.from) {
      return "Seleccionar fechas";
    }
    
    if (dateRange.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    
    return format(dateRange.from, 'dd/MM/yyyy');
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Informes y Estadísticas</h1>
      
      <div className="mb-6">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">{formatDateRange()}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                setCalendarOpen(false);
              }}
              locale={es}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {loading ? (
        <div className="text-center py-8">Cargando datos...</div>
      ) : (
        <div className="space-y-8">
          {/* Gráfico de transacciones */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Ingresos y Gastos</h2>
            {transactionData.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={transactionData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                      height={60}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(2)} €`}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Ingresos" fill="#4ade80" />
                    <Bar dataKey="expense" name="Gastos" fill="#f87171" />
                    <Bar dataKey="balance" name="Balance" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No hay datos disponibles para este período</div>
            )}
          </div>
          
          {/* Productos más vendidos */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Productos Más Vendidos</h2>
            {productData.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 12 }}
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        return name === "Cantidad" 
                          ? `${value.toFixed(2)} g` 
                          : `${value.toFixed(2)} €`;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="quantity" name="Cantidad" fill="#8884d8" />
                    <Bar dataKey="revenue" name="Ingresos" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No hay datos disponibles para este período</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
