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

  console.log('👤 Admin user created:', adminUser.email)

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
      created_by: adminUser.id,
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
      created_by: adminUser.id,
    }
  ]

  for (const letter of sampleLetters) {
    await prisma.letter.create({
      data: letter,
    })
  }

  console.log('📄 Sample letters created')

  // Create sample permission letters
  const samplePermissionLetter = await prisma.permissionLetter.create({
    data: {
      letter_number: '001/IZIN/01/2025',
      date: new Date('2025-01-15'),
      time_start: '08:00',
      time_end: '16:00',
      location: 'Aula Sekolah',
      activity: 'Kegiatan Pramuka',
      letter_type: 'izin_kegiatan',
      reason: 'Mengikuti kegiatan pramuka tingkat kabupaten',
      status: 'approved',
      createdById: adminUser.id,
      participants: {
        create: [
          {
            name: 'Ahmad Rizki',
            class: 'XII IPA 1'
          },
          {
            name: 'Siti Nurhaliza',
            class: 'XII IPA 2'
          }
        ]
      }
    }
  })

  console.log('📄 Sample permission letter created:', samplePermissionLetter.letter_number)

  console.log('✅ Seed completed successfully!')
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