// Simple event system to sync team members across components

export const TEAM_MEMBERS_UPDATED_EVENT = 'teamMembersUpdated';

// Dispatch event when team members are updated
export const notifyTeamMembersUpdated = () => {
  console.log('📢 Notifying team members updated');
  window.dispatchEvent(new CustomEvent(TEAM_MEMBERS_UPDATED_EVENT));
};

// Listen for team members updates
export const onTeamMembersUpdated = (callback: () => void) => {
  const handleUpdate = () => {
    console.log('🔄 Team members update event received');
    callback();
  };
  
  window.addEventListener(TEAM_MEMBERS_UPDATED_EVENT, handleUpdate);
  
  // Return cleanup function
  return () => {
    window.removeEventListener(TEAM_MEMBERS_UPDATED_EVENT, handleUpdate);
  };
};

// Fetch team members from API (now uses users)
export const fetchTeamMembers = async (): Promise<string[]> => {
  try {
    console.log('👥 Fetching team members from API...');
    const response = await fetch('/api/users');
    const data = await response.json();
    
    if (data.success && Array.isArray(data.users)) {
      const members = data.users.map((u: any) => u.username).filter(Boolean);
      console.log('✅ Team members loaded:', members);
      return members;
    } else {
      console.log('❌ Failed to load team members from API');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching team members:', error);
    return [];
  }
};