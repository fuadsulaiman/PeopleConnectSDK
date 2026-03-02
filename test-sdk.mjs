/**
 * Integration test for PeopleConnect TypeScript SDK
 */
import { PeopleConnectSDK } from './dist/index.mjs';

const API_URL = 'https://3.121.226.182/api';

async function runTests() {
  console.log('=== PeopleConnect TypeScript SDK Integration Tests ===\n');
  
  const sdk = new PeopleConnectSDK({
    baseUrl: API_URL,
    onTokenRefresh: (tokens) => {
      console.log('  [Token refreshed]');
    },
    onError: (error) => {
      console.log('  [Error]:', error.message);
    }
  });

  let passed = 0;
  let failed = 0;

  // Test 1: Login
  console.log('Test 1: Login');
  try {
    const loginResult = await sdk.auth.login({
      username: 'admin',
      password: 'Aa@123456'
    });
    if (loginResult.accessToken && loginResult.user) {
      console.log('  ✓ Login successful - User:', loginResult.user.username);
      passed++;
    } else {
      console.log('  ✗ Login failed - No token received');
      failed++;
    }
  } catch (error) {
    console.log('  ✗ Login failed:', error.message);
    failed++;
  }

  // Test 2: Get Current User
  console.log('Test 2: Get Current User');
  try {
    const user = await sdk.auth.getCurrentUser();
    if (user && user.username) {
      console.log('  ✓ Got current user:', user.username);
      passed++;
    } else {
      console.log('  ✗ Failed to get current user');
      failed++;
    }
  } catch (error) {
    console.log('  ✗ Get current user failed:', error.message);
    failed++;
  }

  // Test 3: List Conversations
  console.log('Test 3: List Conversations');
  try {
    const conversations = await sdk.conversations.list({ page: 1, pageSize: 10 });
    console.log('  ✓ Got conversations:', conversations.items?.length || 0, 'items');
    passed++;
  } catch (error) {
    console.log('  ✗ List conversations failed:', error.message);
    failed++;
  }

  // Test 4: List Contacts
  console.log('Test 4: List Contacts');
  try {
    const contacts = await sdk.contacts.list({ page: 1, pageSize: 10 });
    console.log('  ✓ Got contacts:', contacts.items?.length || 0, 'items');
    passed++;
  } catch (error) {
    console.log('  ✗ List contacts failed:', error.message);
    failed++;
  }

  // Test 5: List Notifications
  console.log('Test 5: List Notifications');
  try {
    const notifications = await sdk.notifications.list({ page: 1, pageSize: 10 });
    console.log('  ✓ Got notifications:', notifications.items?.length || 0, 'items');
    passed++;
  } catch (error) {
    console.log('  ✗ List notifications failed:', error.message);
    failed++;
  }

  // Test 6: Get Broadcast Channels
  console.log('Test 6: Get Broadcast Channels');
  try {
    const channels = await sdk.broadcasts.getChannels();
    console.log('  ✓ Got broadcast channels:', channels?.length || 0, 'channels');
    passed++;
  } catch (error) {
    console.log('  ✗ Get broadcast channels failed:', error.message);
    failed++;
  }

  // Test 7: Search Users
  console.log('Test 7: Search Users');
  try {
    const users = await sdk.search.searchUsers('admin', 5);
    console.log('  ✓ Search users returned:', users?.length || 0, 'results');
    passed++;
  } catch (error) {
    console.log('  ✗ Search users failed:', error.message);
    failed++;
  }

  // Test 8: Get Call History
  console.log('Test 8: Get Call History');
  try {
    const calls = await sdk.calls.getHistory({ page: 1, pageSize: 10 });
    console.log('  ✓ Got call history:', calls.items?.length || 0, 'calls');
    passed++;
  } catch (error) {
    console.log('  ✗ Get call history failed:', error.message);
    failed++;
  }

  // Test 9: List Devices
  console.log('Test 9: List Devices');
  try {
    const devices = await sdk.devices.list();
    console.log('  ✓ Got devices:', devices?.length || 0, 'devices');
    passed++;
  } catch (error) {
    console.log('  ✗ List devices failed:', error.message);
    failed++;
  }

  // Test 10: Get Announcements
  console.log('Test 10: Get Announcements');
  try {
    const announcements = await sdk.announcements.list(false);
    console.log('  ✓ Got announcements:', announcements?.length || 0, 'announcements');
    passed++;
  } catch (error) {
    console.log('  ✗ Get announcements failed:', error.message);
    failed++;
  }

  // Summary
  console.log('\n=== Test Results ===');
  console.log('Passed:', passed);
  console.log('Failed:', failed);
  console.log('Total:', passed + failed);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
