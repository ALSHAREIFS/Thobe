import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin with default credentials if in cloud environment or check config
try {
  initializeApp({
    projectId: 'thobi-be88b'
  });
} catch (e) {
  console.log('App init error or already initialized:', e.message);
}

const db = getFirestore();

async function run() {
  console.log('--- STARTING AUDIT & MIGRATION ---');

  // 1. Audit and migrate /users collection
  const usersSnap = await db.collection('users').get();
  console.log(`Total documents in /users: ${usersSnap.size}`);

  let ownersFoundInUsers = [];
  let managersFoundInUsers = [];
  let employeesFoundInUsers = [];
  let shopsFoundInUsers = [];
  let superAdminsFoundInUsers = [];
  let othersInUsers = [];

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const role = data.role;
    if (role === 'OWNER') {
      ownersFoundInUsers.push({ id: doc.id, email: data.email, shopId: data.shopId, name: data.fullName });
    } else if (role === 'MANAGER') {
      managersFoundInUsers.push({ id: doc.id, email: data.email, shopId: data.shopId, name: data.fullName });
    } else if (role === 'EMPLOYEE') {
      employeesFoundInUsers.push({ id: doc.id, email: data.email, shopId: data.shopId, name: data.fullName });
    } else if (role === 'SHOP') {
      shopsFoundInUsers.push({ id: doc.id, email: data.email, shopId: data.shopId, name: data.fullName });
    } else if (role === 'SUPER_ADMIN') {
      superAdminsFoundInUsers.push({ id: doc.id, email: data.email, name: data.fullName });
    } else {
      othersInUsers.push({ id: doc.id, role, email: data.email });
    }
  }

  // 2. Audit and migrate /shops/{shopId}/users collections
  const shopsSnap = await db.collection('shops').get();
  console.log(`Total shops: ${shopsSnap.size}`);

  let ownersFoundInShopUsers = [];
  let managersFoundInShopUsers = [];
  let employeesFoundInShopUsers = [];
  let shopsFoundInShopUsers = [];

  for (const shopDoc of shopsSnap.docs) {
    const shopId = shopDoc.id;
    const shopName = shopDoc.data().name;
    const shopUsersSnap = await db.collection('shops').doc(shopId).collection('users').get();
    for (const uDoc of shopUsersSnap.docs) {
      const uData = uDoc.data();
      const role = uData.role;
      if (role === 'OWNER') {
        ownersFoundInShopUsers.push({ shopId, shopName, userId: uDoc.id, email: uData.email, name: uData.fullName });
      } else if (role === 'MANAGER') {
        managersFoundInShopUsers.push({ shopId, shopName, userId: uDoc.id, email: uData.email, name: uData.fullName });
      } else if (role === 'EMPLOYEE') {
        employeesFoundInShopUsers.push({ shopId, shopName, userId: uDoc.id, email: uData.email, name: uData.fullName });
      } else if (role === 'SHOP') {
        shopsFoundInShopUsers.push({ shopId, shopName, userId: uDoc.id, email: uData.email, name: uData.fullName });
      }
    }
  }

  console.log('=== AUDIT SUMMARY BEFORE UPDATE ===');
  console.log('Users collection:');
  console.log(`- OWNER: ${ownersFoundInUsers.length}`, ownersFoundInUsers);
  console.log(`- SHOP: ${shopsFoundInUsers.length}`, shopsFoundInUsers);
  console.log(`- SUPER_ADMIN: ${superAdminsFoundInUsers.length}`, superAdminsFoundInUsers);
  console.log(`- MANAGER: ${managersFoundInUsers.length}`, managersFoundInUsers);
  console.log(`- EMPLOYEE: ${employeesFoundInUsers.length}`, employeesFoundInUsers);

  console.log('\nShop Members collection:');
  console.log(`- OWNER: ${ownersFoundInShopUsers.length}`, ownersFoundInShopUsers);
  console.log(`- SHOP: ${shopsFoundInShopUsers.length}`, shopsFoundInShopUsers);
  console.log(`- MANAGER: ${managersFoundInShopUsers.length}`, managersFoundInShopUsers);
  console.log(`- EMPLOYEE: ${employeesFoundInShopUsers.length}`, employeesFoundInShopUsers);

  // 3. EXECUTE MIGRATION: Update ONLY OWNER to SHOP
  let updatedUsersCount = 0;
  for (const o of ownersFoundInUsers) {
    await db.collection('users').doc(o.id).update({
      role: 'SHOP'
    });
    updatedUsersCount++;
  }

  let updatedShopMembersCount = 0;
  for (const o of ownersFoundInShopUsers) {
    await db.collection('shops').doc(o.shopId).collection('users').doc(o.userId).update({
      role: 'SHOP'
    });
    updatedShopMembersCount++;
  }

  console.log('\n=== MIGRATION COMPLETED ===');
  console.log(`Updated in /users: ${updatedUsersCount}`);
  console.log(`Updated in /shops/{shopId}/users: ${updatedShopMembersCount}`);
}

run().catch(console.error);
