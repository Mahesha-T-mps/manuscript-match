const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createMPSUsers() {
  try {
    console.log('🔍 Creating MPS Limited users...');

    // Define all MPS users with email and password (first name + 123)
    const mpsUsers = [
      { email: 'shreya.anand@mpslimited.com', password: 'Shreya123', role: 'USER' },
      { email: 'Karthika.A@mpslimited.com', password: 'Karthika123', role: 'USER' },
      { email: 'Roshika.salini@mpslimited.com', password: 'Roshika123', role: 'USER' },
      { email: 'Mahaalaxmi.Venkatesan@mpslimited.com', password: 'Mahaalaxmi123', role: 'USER' },
      { email: 'Aishwarya.SK@mpslimited.com', password: 'Aishwarya123', role: 'USER' },
      { email: 'Theerdha.Veena@mpslimited.com', password: 'Theerdha123', role: 'USER' },
      { email: 'Kanimozhi.G@mps-in.com', password: 'Kanimozhi123', role: 'USER' },
      { email: 'vignesh.loganathan@mpslimited.com', password: 'Vignesh123', role: 'USER' },
      { email: 'roshini.b@mpslimited.com', password: 'Roshini123', role: 'USER' },
      { email: 'Shamini.L@mpslimited.com', password: 'Shamini123', role: 'USER' },
      { email: 'harsh.maan@mpslimited.com', password: 'Harshman123', role: 'USER' },
      { email: 'arpita.rawat@mpslimited.com', password: 'Arpita123', role: 'USER' },
      { email: 'jyoti.jha@mpslimited.com', password: 'Jyoti123', role: 'USER' },
      { email: 'neha.chauhan@mpslimited.com', password: 'Neha123', role: 'USER' },
      { email: 'Nivethitha.K@mpslimited.com', password: 'Nivethitha123', role: 'USER' },
      { email: 'Harshini.E@mpslimited.com', password: 'Harshini123', role: 'USER' },
      { email: 'Nandhini.K@mps-in.com', password: 'Nandhini123', role: 'USER' },
      { email: 'Sundarapandian.P@mpslimited.com', password: 'Sundarapandian123', role: 'USER' },
      { email: 'Monika.K@mpslimited.com', password: 'Monika123', role: 'USER' },
      { email: 'Namachivayam.D@mpslimited.com', password: 'Namachivayam123', role: 'USER' },
      { email: 'Dhivyapriya.S@mpslimited.com', password: 'Dhivyapriya123', role: 'USER' },
      { email: 'Monika.B@mpslimited.com', password: 'Monika123', role: 'USER' },
      { email: 'Davidson.SP@mpslimited.com', password: 'Davidson123', role: 'USER' },
      { email: 'Raghavi.R@mpslimited.com', password: 'Raghavi123', role: 'USER' },
      { email: 'Rajarathinam.A@mpslimited.com', password: 'Rajarathinam123', role: 'USER' },
      { email: 'Bernice.Shiny@mpslimited.com', password: 'Bernice123', role: 'USER' },
      { email: 'Harihara.Subramaniam@mpslimited.com', password: 'Harihara123', role: 'USER' },
      { email: 'Aravindhan.S@mpslimited.com', password: 'Aravindhan123', role: 'USER' },
      { email: 'Srioviya.J@mpslimited.com', password: 'Srioviya123', role: 'USER' },
      { email: 'Divya.Dharsa@mpslimited.com', password: 'Divya123', role: 'USER' },
      { email: 'GiridharKrishna@mpslimited.com', password: 'Giridhar123', role: 'USER' },
      { email: 'Iman.Thoufic@mpslimited.com', password: 'Iman123', role: 'USER' },
      { email: 'Gayathri.Rajan@mpslimited.com', password: 'Gayathri123', role: 'USER' },
      { email: 'Varshini.AS@mpslimited.com', password: 'Varshini123', role: 'USER' },
      { email: 'Gunasree.S@mpslimited.com', password: 'Gunasree123', role: 'USER' },
      { email: 'akash.phillip@mpslimited.com', password: 'Akash123', role: 'USER' },
      { email: 'Kiruthika.s@mpslimited.com', password: 'Kiruthika123', role: 'USER' },
      { email: 'divyadharshini.t@mpslimited.com', password: 'Divyadharshini123', role: 'USER' },
      { email: 'pooja.s@mpslimited.com', password: 'Pooja123', role: 'USER' },
      { email: 'gomathi.manickavelu@mpslimited.com', password: 'Gomathi123', role: 'USER' },
      { email: 'gunasree.s@mpslimited.com', password: 'Gunasree123', role: 'USER' },
      { email: 'bhuvaneshwari.r@mpslimited.com', password: 'Bhuvaneshwari123', role: 'USER' },
      { email: 'kavya.nair@mpslimited.com', password: 'Kavya123', role: 'USER' },
      { email: 'deebika.d@mpslimited.com', password: 'Deebika123', role: 'USER' },
      { email: 'sangeetha.kaliyamoorthy@mpslimited.com', password: 'Sangeetha123', role: 'USER' },
      { email: 'b.balan@mpslimited.com', password: 'Aswin123', role: 'USER' },
      { email: 'Suriya.Prakash@mpslimited.com', password: 'Suriya123', role: 'USER' },
      { email: 'durga.nandhini@mpslimited.com', password: 'Durga123', role: 'USER' },
      { email: 'ThaseenaBegum@mpslimited.com', password: 'Thaseena123', role: 'USER' },
      { email: 'sakthi.e@mpslimited.com', password: 'Sakthi123', role: 'USER' },
      { email: 'kavin@mpslimited.com', password: 'Kavin123', role: 'USER' },
      { email: 'sneha.s@mpslimited.com', password: 'Sneha123', role: 'USER' },
      { email: 'Anurithi.B@mpslimited.com', password: 'Anurithi123', role: 'USER' }
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log(`📊 Processing ${mpsUsers.length} users...`);

    for (const userData of mpsUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️ User already exists: ${userData.email}`);
          skipCount++;
          continue;
        }

        console.log(`🔐 Creating user: ${userData.email}`);

        // Hash password with bcrypt
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            passwordHash,
            role: userData.role,
            status: 'ACTIVE'
          }
        });

        console.log(`✅ Created user: ${user.email} - ID: ${user.id}`);
        successCount++;

        // Test password verification
        const isValid = await bcrypt.compare(userData.password, passwordHash);
        if (!isValid) {
          console.log(`❌ Password verification failed for ${userData.email}`);
        }

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 MPS Users Creation Summary:');
    console.log(`✅ Successfully created: ${successCount} users`);
    console.log(`⚠️ Already existed: ${skipCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${mpsUsers.length} users`);

    if (successCount > 0) {
      console.log('\n📝 Sample login credentials (Password format: FirstName123):');
      console.log('shreya.anand@mpslimited.com / Shreya123');
      console.log('Karthika.A@mpslimited.com / Karthika123');
      console.log('vignesh.loganathan@mpslimited.com / Vignesh123');
      console.log('... and so on for all users');
    }

  } catch (error) {
    console.error('❌ Error creating MPS users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMPSUsers();