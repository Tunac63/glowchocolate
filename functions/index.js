const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

// notification_queue'daki pending kayıtları FCM'e gönder
exports.processNotificationQueue = functions.firestore
  .document('notification_queue/{id}')
  .onCreate(async (snap, context) => {
    const data = snap.data() || {}
    try {
      // Alıcıları belirle
      let tokens = []
      if (data.audience?.type === 'all') {
        const usersSnap = await db.collection('users').where('isActive', '==', true).get()
        usersSnap.forEach(d => {
          const t = d.get('fcmToken')
          if (t) tokens.push(t)
        })
      } else if (Array.isArray(data.audience?.uids) && data.audience.uids.length) {
        const usersSnap = await db.collection('users').where('uid', 'in', data.audience.uids.slice(0, 10)).get()
        usersSnap.forEach(d => { const t = d.get('fcmToken'); if (t) tokens.push(t) })
      }

      tokens = Array.from(new Set(tokens))
      if (tokens.length === 0) {
        await snap.ref.update({ status: 'skipped', reason: 'no_tokens', processedAt: admin.firestore.FieldValue.serverTimestamp() })
        return
      }

      const message = {
        notification: data.notification || { title: 'GlowChocolate', body: '' },
        data: data.data || {},
        tokens
      }

      const res = await admin.messaging().sendEachForMulticast(message)
      await snap.ref.update({ status: 'sent', successCount: res.successCount, failureCount: res.failureCount, processedAt: admin.firestore.FieldValue.serverTimestamp() })
    } catch (err) {
      console.error('Queue processing error', err)
      await snap.ref.update({ status: 'failed', error: String(err), processedAt: admin.firestore.FieldValue.serverTimestamp() })
    }
  })
