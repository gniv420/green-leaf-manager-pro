
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, UserRound, Cannabis, Phone, Key } from 'lucide-react';
import { Member } from '@/lib/db';
import { useTheme } from '@/hooks/use-theme';

interface MemberCardProps {
  member: Member;
  onDispensary?: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onDispensary }) => {
  const navigate = useNavigate();
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const { theme } = useTheme();

  const toggleSensitiveInfo = () => {
    setShowSensitiveInfo(prev => !prev);
  };

  // Función para ocultar información sensible
  const maskedValue = (value: string) => {
    if (!showSensitiveInfo) {
      return value.replace(/./g, '•');
    }
    return value;
  };

  // Función para navegar a la página de dispensario preseleccionando el socio
  const handleDispensaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDispensary) {
      onDispensary();
    } else {
      // Navigate with state param to ensure the member ID is passed correctly
      navigate(`/dispensary?memberId=${member.id}`);
    }
  };

  const handlePhoneCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (member.phone) {
      window.location.href = `tel:${member.phone}`;
    }
  };

  // Ensure balance is always a number
  const balance = member.balance ?? 0;

  return (
    <Card className={`h-full transition-colors ${theme === 'dark' ? 'bg-secondary/20' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">{member.firstName} {member.lastName}</CardTitle>
            <p className="text-sm font-mono text-muted-foreground">{member.memberCode}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={toggleSensitiveInfo}>
            {showSensitiveInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">DNI:</span>
            <span className="font-medium">{maskedValue(member.dni)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fecha de nacimiento:</span>
            <span className="font-medium">{maskedValue(new Date(member.dob).toLocaleDateString())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Teléfono:</span>
            <div className="flex items-center gap-1">
              <span className="font-medium">{maskedValue(member.phone || '666666666')}</span>
              {showSensitiveInfo && member.phone && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handlePhoneCall}>
                  <Phone className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">RFID:</span>
            <div className="flex items-center gap-1">
              {member.rfidCode ? (
                <>
                  <span className="font-medium font-mono">{showSensitiveInfo ? member.rfidCode : '••••••'}</span>
                  <Key className="h-3 w-3 text-blue-500" />
                </>
              ) : (
                <span className="text-muted-foreground italic text-xs">No asignado</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Consumo mensual:</span>
            <span className="font-medium">{member.consumptionGrams} g</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Saldo:</span>
            <span className={`font-medium ${balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {balance.toFixed(2)} €
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex flex-col gap-2">
        <Button 
          variant="default" 
          className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          onClick={() => navigate(`/members/${member.id}`)}
        >
          <UserRound className="mr-2 h-4 w-4" />
          Detalles
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleDispensaryClick}
        >
          <Cannabis className="mr-2 h-4 w-4" />
          Dispensar
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MemberCard;
