// src/auth/dto/me.dto.ts
export class UserMeDto {
    id: string;
    fullName: string;
    displayName: string | null;
    email: string;
    createdAt: Date;
  
    hasFamily: boolean;
  
    // Família atualmente ativa (muito útil para o frontend)
    activeFamilyId?: string;
    activeFamilyName?: string;
    activeFamilyRole?: 'OWNER' | 'MEMBER';
  
    // Lista de todas as famílias que o usuário participa
    families: Array<{
      id: string;
      name: string;
      role: 'OWNER' | 'MEMBER';
    }>;
  }