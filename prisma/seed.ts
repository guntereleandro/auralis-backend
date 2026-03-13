// prisma/seed.ts
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// ====================== CATEGORIAS PADRÃO ======================
// userId: null + familyId: null = categoria global (disponível para todos)
// isDefault: true = criada pelo sistema, não pode ser deletada pelo usuário

const defaultCategories: Array<{
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}> = [
  // ===== DESPESAS =====
  { name: 'Alimentação',      type: 'EXPENSE', color: '#FF6B6B', icon: 'utensils' },
  { name: 'Moradia',          type: 'EXPENSE', color: '#4ECDC4', icon: 'home' },
  { name: 'Transporte',       type: 'EXPENSE', color: '#45B7D1', icon: 'car' },
  { name: 'Saúde',            type: 'EXPENSE', color: '#96CEB4', icon: 'heart-pulse' },
  { name: 'Educação',         type: 'EXPENSE', color: '#FFEAA7', icon: 'book-open' },
  { name: 'Lazer',            type: 'EXPENSE', color: '#DDA0DD', icon: 'gamepad-2' },
  { name: 'Vestuário',        type: 'EXPENSE', color: '#F0A500', icon: 'shirt' },
  { name: 'Supermercado',     type: 'EXPENSE', color: '#FF8C69', icon: 'shopping-cart' },
  { name: 'Restaurante',      type: 'EXPENSE', color: '#FF6347', icon: 'chef-hat' },
  { name: 'Assinaturas',      type: 'EXPENSE', color: '#9B59B6', icon: 'tv' },
  { name: 'Pets',             type: 'EXPENSE', color: '#A8D8EA', icon: 'paw-print' },
  { name: 'Beleza',           type: 'EXPENSE', color: '#FFB6C1', icon: 'scissors' },
  { name: 'Tecnologia',       type: 'EXPENSE', color: '#778CA3', icon: 'smartphone' },
  { name: 'Viagem',           type: 'EXPENSE', color: '#00B894', icon: 'plane' },
  { name: 'Impostos',         type: 'EXPENSE', color: '#636E72', icon: 'landmark' },
  { name: 'Outros',           type: 'EXPENSE', color: '#B2BEC3', icon: 'circle-ellipsis' },

  // ===== RECEITAS =====
  { name: 'Salário',          type: 'INCOME',  color: '#55EFC4', icon: 'briefcase' },
  { name: 'Freelance',        type: 'INCOME',  color: '#00CEC9', icon: 'laptop' },
  { name: 'Investimentos',    type: 'INCOME',  color: '#6C5CE7', icon: 'trending-up' },
  { name: 'Aluguel Recebido', type: 'INCOME',  color: '#FDCB6E', icon: 'building' },
  { name: 'Presente',         type: 'INCOME',  color: '#FD79A8', icon: 'gift' },
  { name: 'Reembolso',        type: 'INCOME',  color: '#81ECEC', icon: 'rotate-ccw' },
  { name: 'Outros',           type: 'INCOME',  color: '#B2BEC3', icon: 'circle-ellipsis' },
];

async function main() {
  console.log('🌱 Iniciando seed de categorias padrão...');

  let created = 0;
  let skipped = 0;

  for (const category of defaultCategories) {
    // Verifica se já existe para evitar duplicatas em re-runs
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        type: category.type,
        userId: null,
        familyId: null,
        isDefault: true,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.category.create({
      data: {
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
        isDefault: true,
        userId: null,    // ← não pertence a nenhum usuário
        familyId: null,  // ← não pertence a nenhuma família
        syncStatus: 'SYNCED',
        createdLocally: false,
      },
    });

    created++;
  }

  console.log(`✅ Seed concluído!`);
  console.log(`   → ${created} categorias criadas`);
  console.log(`   → ${skipped} categorias já existiam (ignoradas)`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });