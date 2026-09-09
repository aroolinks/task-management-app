// Debug script to test assignment functionality
console.log('🔍 Testing Assignment Feature...');

// Test 1: Check if team members are being fetched
async function testTeamMembersFetch() {
  try {
    console.log('📋 Testing /api/users endpoint...');
    const response = await fetch('http://localhost:3000/api/users');
    const data = await response.json();
    console.log('✅ Users API Response:', data);
    
    if (data.success && Array.isArray(data.users)) {
      console.log('👥 Team Members Found:', data.users.map(u => u.username));
      return data.users.map(u => u.username);
    } else {
      console.log('❌ No team members found or API error');
      return [];
    }
  } catch (error) {
    console.log('❌ Error fetching team members:', error);
    return [];
  }
}

// Test 2: Check if clients API returns assignment data
async function testClientsAPI() {
  try {
    console.log('📋 Testing /api/clients endpoint...');
    const response = await fetch('http://localhost:3000/api/clients');
    const data = await response.json();
    console.log('✅ Clients API Response:', data);
    
    if (data.success && Array.isArray(data.data)) {
      data.data.forEach(client => {
        console.log(`📝 Client: ${client.name}`);
        if (Array.isArray(client.notes)) {
          client.notes.forEach(note => {
            console.log(`  - Note: ${note.title}`);
            console.log(`    assignedTo: ${note.assignedTo || 'none'}`);
            console.log(`    createdBy: ${note.createdBy || 'none'}`);
          });
        }
      });
    }
  } catch (error) {
    console.log('❌ Error fetching clients:', error);
  }
}

// Run tests
testTeamMembersFetch();
testClientsAPI();