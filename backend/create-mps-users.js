const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Function to generate 4 random numbers
function generateRandomNumbers() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function createMPSUsers() {
  try {
    console.log('🔍 Creating MPS Limited users...');

    // Define all MPS users with email, firstName, and actual current passwords
    const mpsUsers = [
      // Original MPS Users (with current passwords from database)
      { email: 'shreya.anand@mpslimited.com', firstName: 'Shreya', password: 'Shreya8183', role: 'USER' },
      { email: 'Karthika.A@mpslimited.com', firstName: 'Karthika', password: 'Karthika8625', role: 'USER' },
      { email: 'Roshika.salini@mpslimited.com', firstName: 'Roshika', password: 'Roshika3247', role: 'USER' },
      { email: 'Mahaalaxmi.Venkatesan@mpslimited.com', firstName: 'Mahaalaxmi', password: 'Mahaalaxmi3090', role: 'USER' },
      { email: 'Aishwarya.SK@mpslimited.com', firstName: 'Aishwarya', password: 'Aishwarya5990', role: 'USER' },
      { email: 'Theerdha.Veena@mpslimited.com', firstName: 'Theerdha', password: 'Theerdha5555', role: 'USER' },
      { email: 'Kanimozhi.G@mps-in.com', firstName: 'Kanimozhi', password: 'Kanimozhi2427', role: 'USER' },
      { email: 'vignesh.loganathan@mpslimited.com', firstName: 'Vignesh', password: 'Vignesh8467', role: 'USER' },
      { email: 'roshini.b@mpslimited.com', firstName: 'Roshini', password: 'Roshini2345', role: 'USER' },
      { email: 'Shamini.L@mpslimited.com', firstName: 'Shamini', password: 'Shamini2917', role: 'USER' },
      { email: 'harsh.maan@mpslimited.com', firstName: 'Harshman', password: 'Harshman1910', role: 'USER' },
      { email: 'arpita.rawat@mpslimited.com', firstName: 'Arpita', password: 'Arpita9927', role: 'USER' },
      { email: 'jyoti.jha@mpslimited.com', firstName: 'Jyoti', password: 'Jyoti3987', role: 'USER' },
      { email: 'neha.chauhan@mpslimited.com', firstName: 'Neha', password: 'Neha3845', role: 'USER' },
      { email: 'Nivethitha.K@mpslimited.com', firstName: 'Nivethitha', password: 'Nivethitha9928', role: 'USER' },
      { email: 'Harshini.E@mpslimited.com', firstName: 'Harshini', password: 'Harshini5715', role: 'USER' },
      { email: 'Nandhini.K@mps-in.com', firstName: 'Nandhini', password: 'Nandhini6574', role: 'USER' },
      { email: 'Sundarapandian.P@mpslimited.com', firstName: 'Sundarapandian', password: 'Sundarapandian5343', role: 'USER' },
      { email: 'Monika.K@mpslimited.com', firstName: 'Monika', password: 'Monika4681', role: 'USER' },
      { email: 'Namachivayam.D@mpslimited.com', firstName: 'Namachivayam', password: 'Namachivayam3808', role: 'USER' },
      { email: 'Dhivyapriya.S@mpslimited.com', firstName: 'Dhivyapriya', password: 'Dhivyapriya9259', role: 'USER' },
      { email: 'Monika.B@mpslimited.com', firstName: 'Monika', password: 'Monika9969', role: 'USER' },
      { email: 'Davidson.SP@mpslimited.com', firstName: 'Davidson', password: 'Davidson1409', role: 'USER' },
      { email: 'Raghavi.R@mpslimited.com', firstName: 'Raghavi', password: 'Raghavi8303', role: 'USER' },
      { email: 'Rajarathinam.A@mpslimited.com', firstName: 'Rajarathinam', password: 'Rajarathinam7967', role: 'USER' },
      { email: 'Bernice.Shiny@mpslimited.com', firstName: 'Bernice', password: 'Bernice2897', role: 'USER' },
      { email: 'Harihara.Subramaniam@mpslimited.com', firstName: 'Harihara', password: 'Harihara4394', role: 'USER' },
      { email: 'Aravindhan.S@mpslimited.com', firstName: 'Aravindhan', password: 'Aravindhan9697', role: 'USER' },
      { email: 'Srioviya.J@mpslimited.com', firstName: 'Srioviya', password: 'Srioviya5682', role: 'USER' },
      { email: 'Divya.Dharsa@mpslimited.com', firstName: 'Divya', password: 'Divya9008', role: 'USER' },
      { email: 'GiridharKrishna@mpslimited.com', firstName: 'Giridhar', password: 'Giridhar7566', role: 'USER' },
      { email: 'Iman.Thoufic@mpslimited.com', firstName: 'Iman', password: 'Iman1468', role: 'USER' },
      { email: 'Gayathri.Rajan@mpslimited.com', firstName: 'Gayathri', password: 'Gayathri4069', role: 'USER' },
      { email: 'Varshini.AS@mpslimited.com', firstName: 'Varshini', password: 'Varshini1157', role: 'USER' },
      { email: 'Gunasree.S@mpslimited.com', firstName: 'Gunasree', password: 'Gunasree4672', role: 'USER' },
      { email: 'akash.phillip@mpslimited.com', firstName: 'Akash', password: 'Akash1578', role: 'USER' },
      { email: 'Kiruthika.s@mpslimited.com', firstName: 'Kiruthika', password: 'Kiruthika6376', role: 'USER' },
      { email: 'divyadharshini.t@mpslimited.com', firstName: 'Divyadharshini', password: 'Divyadharshini1557', role: 'USER' },
      { email: 'pooja.s@mpslimited.com', firstName: 'Pooja', password: 'Pooja2350', role: 'USER' },
      { email: 'gomathi.manickavelu@mpslimited.com', firstName: 'Gomathi', password: 'Gomathi3853', role: 'USER' },
      { email: 'gunasree.s@mpslimited.com', firstName: 'Gunasree', password: 'Gunasree5246', role: 'USER' },
      { email: 'bhuvaneshwari.r@mpslimited.com', firstName: 'Bhuvaneshwari', password: 'Bhuvaneshwari3153', role: 'USER' },
      { email: 'kavya.nair@mpslimited.com', firstName: 'Kavya', password: 'Kavya6051', role: 'USER' },
      { email: 'deebika.d@mpslimited.com', firstName: 'Deebika', password: 'Deebika6510', role: 'USER' },
      { email: 'sangeetha.kaliyamoorthy@mpslimited.com', firstName: 'Sangeetha', password: 'Sangeetha6996', role: 'USER' },
      { email: 'b.balan@mpslimited.com', firstName: 'Aswin', password: 'Aswin8702', role: 'USER' },
      { email: 'Suriya.Prakash@mpslimited.com', firstName: 'Suriya', password: 'Suriya6582', role: 'USER' },
      { email: 'durga.nandhini@mpslimited.com', firstName: 'Durga', password: 'Durga8944', role: 'USER' },
      { email: 'ThaseenaBegum@mpslimited.com', firstName: 'Thaseena', password: 'Thaseena7668', role: 'USER' },
      { email: 'sakthi.e@mpslimited.com', firstName: 'Sakthi', password: 'Sakthi3566', role: 'USER' },
      { email: 'kavin@mpslimited.com', firstName: 'Kavin', password: 'Kavin9360', role: 'USER' },
      { email: 'sneha.s@mpslimited.com', firstName: 'Sneha', password: 'Sneha7334', role: 'USER' },
      { email: 'Anurithi.B@mpslimited.com', firstName: 'Anurithi', password: 'Anurithi2966', role: 'USER' },
      
      // Additional New Users
      { email: 'kaviya.s@mpslimited.com', firstName: 'Kaviya', password: 'Kaviya9751', role: 'USER' },
      { email: 'vinuchakkaravarthy.t@mpslimited.com', firstName: 'Vinuchakkaravarthy', password: 'Vinuchakkaravarthy9875', role: 'USER' },
      { email: 'christy.anitha@mpslimited.com', firstName: 'Christy', password: 'Christy3321', role: 'USER' }
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
      console.log('\n📝 Login credentials (using current database passwords):');
      console.log('Sample credentials:');
      console.log('shreya.anand@mpslimited.com / Shreya8183');
      console.log('Karthika.A@mpslimited.com / Karthika8625');
      console.log('vignesh.loganathan@mpslimited.com / Vignesh8467');
      console.log('... using actual passwords from database');
      
      console.log('\n📄 Complete credentials list available in: updated_mps_credentials.csv');
    }

  } catch (error) {
    console.error('❌ Error creating MPS users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMPSUsers();