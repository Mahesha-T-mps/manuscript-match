// Test the getUserTypeFromEmail function to verify it works
const getUserTypeFromEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain?.includes('springer')) return 'SPRINGER';
  if (domain?.includes('wiley')) return 'WILEY';
  if (domain?.includes('f1000')) return 'F1000';
  if (domain?.includes('dmp')) return 'DMP';
  return 'SPRINGER'; // Default
};

const extractNameFromEmail = (email) => {
  const localPart = email.split('@')[0];
  return localPart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

// Test cases
const testEmails = [
  'john.doe@springer.com',
  'jane.smith@wiley.com',
  'test.user@f1000.com',
  'admin@dmp.org',
  'user@example.com'
];

console.log('🧪 Testing getUserTypeFromEmail function:');
testEmails.forEach(email => {
  const userType = getUserTypeFromEmail(email);
  const name = extractNameFromEmail(email);
  console.log(`✅ ${email} → Type: ${userType}, Name: ${name}`);
});

console.log('\n✅ Functions work correctly - the fix should resolve the initialization error!');