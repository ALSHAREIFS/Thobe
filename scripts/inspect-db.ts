import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore({
  projectId: 'thobi-be88b',
});

async function run() {
  console.log('=== Inspecting Firestore for Shop Data ===');
  
  // 1. List shops
  const shopsSnap = await firestore.collection('shops').get();
  console.log(`Found ${shopsSnap.size} shops:`);
  for (const shopDoc of shopsSnap.docs) {
    const shopId = shopDoc.id;
    const shopData = shopDoc.data();
    console.log(`\nShop: [${shopId}] name: ${shopData.name || shopData.shopName}`);

    // Orders
    const ordersSnap = await firestore.collection(`shops/${shopId}/orders`).get();
    console.log(`  Orders (${ordersSnap.size}):`);
    ordersSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`    - docId: ${doc.id}, orderId: ${d.orderId}, orderNumber: ${d.orderNumber}, customer: ${d.customerName}, status: ${d.status}, total: ${d.pricing?.totalAmount}, paid: ${d.pricing?.paidAmount}, refunded: ${d.pricing?.refundedAmount}`);
    });

    // Payments
    const paymentsSnap = await firestore.collection(`shops/${shopId}/payments`).get();
    console.log(`  Payments (${paymentsSnap.size}):`);
    paymentsSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`    - docId: ${doc.id}, receiptNumber: ${d.receiptNumber}, orderId: ${d.orderId}, orderNumber: ${d.orderNumber}, customer: ${d.customerName || d.customerId}, amount: ${d.amount}, method: ${d.method || d.paymentMethod}, createdAt: ${d.createdAt}`);
    });

    // Refunds
    const refundsSnap = await firestore.collection(`shops/${shopId}/refunds`).get();
    console.log(`  Refunds (${refundsSnap.size}):`);
    refundsSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`    - docId: ${doc.id}, refundId: ${d.refundId}, orderId: ${d.orderId}, orderNumber: ${d.orderNumber}, customer: ${d.customerName}, amount: ${d.amount}, method: ${d.paymentMethod}, reason: ${d.reason}, createdAt: ${d.createdAt}`);
    });
  }
}

run().catch(console.error);
