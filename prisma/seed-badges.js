import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
  // Engagement badges
  { name: 'first_login', description: 'Welcome! You logged in for the first time', icon: '👋', category: 'engagement' },
  { name: 'first_assignment', description: 'Completed your first assignment', icon: '🎯', category: 'achievement' },
  { name: 'first_session', description: 'Completed your first study session', icon: '📚', category: 'study' },
  { name: 'daily_visitor', description: 'Visited the platform 5 days in a row', icon: '📅', category: 'engagement' },
  { name: 'week_streak', description: 'Maintained a 7-day study streak', icon: '🔥', category: 'streak' },
  { name: 'month_streak', description: 'Maintained a 30-day study streak', icon: '💪', category: 'streak' },
  { name: 'century_streak', description: 'Achieved a 100-day streak!', icon: '🏆', category: 'streak' },
  { name: 'ten_assignments', description: 'Completed 10 assignments', icon: '⭐', category: 'achievement' },
  { name: 'fifty_assignments', description: 'Completed 50 assignments', icon: '🌟', category: 'achievement' },
  { name: 'ten_hours_study', description: 'Studied for 10 hours total', icon: '⏰', category: 'study' },
  { name: 'note_taker', description: 'Created 10 notes', icon: '📝', category: 'study' },
  { name: 'early_bird', description: 'Started studying before 8 AM', icon: '🌅', category: 'engagement' },
  { name: 'night_owl', description: 'Studied after 10 PM', icon: '🦉', category: 'engagement' },
  { name: 'weekend_warrior', description: 'Studied on the weekend', icon: '🎮', category: 'engagement' },
  { name: 'focused', description: 'Completed 5 Pomodoro sessions', icon: '🍅', category: 'study' },
  { name: 'chunk_master', description: 'Created chunks for 5 assignments', icon: '✂️', category: 'study' },
  { name: 'cheatsheet_creator', description: 'Created 5 cheatsheets', icon: '📋', category: 'study' },
  { name: 'attention_hero', description: 'Used attention check 10 times', icon: '👁️', category: 'engagement' },
  { name: 'canvas_connected', description: 'Connected your Canvas account', icon: '🔗', category: 'engagement' },
  { name: 'perfect_week', description: 'Studied every day for a week', icon: '📊', category: 'streak' },
];

async function main() {
  console.log('Seeding badges...');
  
  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
  }
  
  console.log(`✅ Seeded ${badges.length} badges`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

