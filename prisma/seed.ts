import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create admin user
  const adminUser = await prisma.adminUser.upsert({
    where: { email: 'admin@sekolah.com' },
    update: {},
    create: {
      email: 'admin@sekolah.com',
      password: hashedPassword,
      name: 'Administrator',
      role: 'admin',
      is_active: true,
    },
  })

 
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })