const webpush = require('web-push');

console.log('🔑 Generating VAPID keys for Web Push...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys Generated:');
console.log('===================');
console.log(`Public Key:  ${vapidKeys.publicKey}`);
console.log(`Private Key: ${vapidKeys.privateKey}\n`);

console.log('Add these to your .env file:');
console.log('============================');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your-email@example.com\n`);

console.log('For frontend, use the public key in your service worker registration.');
console.log('Example:');
console.log(`const vapidPublicKey = '${vapidKeys.publicKey}';`);
