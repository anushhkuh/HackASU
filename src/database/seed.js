import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding badges...');

  const badges = [
    {
      name: 'first_assignment',
      description: 'Complete your first assignment',
      category: 'achievement',
      icon: '🎯',
    },
    {
      name: 'ten_assignments',
      description: 'Complete 10 assignments',
      category: 'achievement',
      icon: '⭐',
    },
    {
      name: 'fifty_assignments',
      description: 'Complete 50 assignments',
      category: 'achievement',
      icon: '🏆',
    },
    {
      name: 'first_session',
      description: 'Complete your first study session',
      category: 'study',
      icon: '📚',
    },
    {
      name: 'ten_hours_study',
      description: 'Study for 10 hours total',
      category: 'study',
      icon: '⏰',
    },
    {
      name: 'week_streak',
      description: 'Maintain a 7-day streak',
      category: 'streak',
      icon: '🔥',
    },
    {
      name: 'month_streak',
      description: 'Maintain a 30-day streak',
      category: 'streak',
      icon: '💪',
    },
    {
      name: 'century_streak',
      description: 'Achieve a 100-day streak',
      category: 'streak',
      icon: '👑',
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

