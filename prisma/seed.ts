import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create admin user
  const admin = await prisma.adminUser.upsert({
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

  console.log('👤 Admin user created:', admin.email)

  // Create sample categories
  const categories = [
    { 
      name: 'Surat Dinas', 
      description: 'Surat resmi dinas',
      color: '#3B82F6'
    },
    { 
      name: 'Surat Undangan', 
      description: 'Surat undangan kegiatan',
      color: '#10B981'
    },
    { 
      name: 'Surat Pemberitahuan', 
      description: 'Surat pemberitahuan umum',
      color: '#F59E0B'
    },
    { 
      name: 'Surat Permohonan', 
      description: 'Surat permohonan izin',
      color: '#EF4444'
    },
  ]

  for (const category of categories) {
    await prisma.letterCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    })
  }

  console.log('📂 Categories created')

  // Create sample letters
  const sampleLetters = [
    {
      letter_number: 'SMS/001/2024',
      title: 'Surat Undangan Rapat Koordinasi',
      subject: 'Undangan Rapat Koordinasi Bulanan',
      content: 'Dengan hormat, kami mengundang Bapak/Ibu untuk menghadiri rapat koordinasi...',
      type: 'incoming',
      sender: 'Dinas Pendidikan',
      recipient: 'Kepala Sekolah',
      status: 'new',
      created_by: admin.id,
    },
    {
      letter_number: 'SMS/002/2024',
      title: 'Surat Pemberitahuan Libur Nasional',
      subject: 'Pemberitahuan Libur Hari Kemerdekaan',
      content: 'Sehubungan dengan peringatan Hari Kemerdekaan RI...',
      type: 'outgoing',
      sender: 'Kepala Sekolah',
      recipient: 'Seluruh Warga Sekolah',
      status: 'sent',
      created_by: admin.id,
    }
  ]

  for (const letter of sampleLetters) {
    await prisma.letter.create({
      data: letter,
    })
  }

  console.log('📄 Sample letters created')
  console.log('✅ Seed completed!')
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