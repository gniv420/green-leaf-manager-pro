
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, UserRound } from 'lucide-react';
import { Member } from '@/lib/db';

interface MemberCardProps {
  member: Member;
}

const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  const navigate = useNavigate();
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

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

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">{member.firstName} {member.lastName}</CardTitle>
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
            <span className="text-muted-foreground">Consumo mensual:</span>
            <span className="font-medium">{member.consumptionGrams} g</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Saldo:</span>
            <span className="font-medium text-green-600">{(member.balance || 0).toFixed(2)} €</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="default" 
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => navigate(`/members/${member.id}`)}
        >
          <UserRound className="mr-2 h-4 w-4" />
          Ver detalles
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MemberCard;
