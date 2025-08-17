const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

// Ortak: Tek bir notification_queue dokümanını işleyip durumunu günceller
async function processQueueDoc(snap) {
  const data = snap.data() || {}
  // Alıcıları belirle
  let tokens = []
  if (data.audience?.type === 'all') {
    const usersSnap = await db.collection('users').where('isActive', '==', true).get()
    usersSnap.forEach(d => {
      const t = d.get('fcmToken')
      if (t) tokens.push(t)
    })
  } else if (Array.isArray(data.audience?.uids) && data.audience.uids.length) {
    // Firestore 'in' 10 eleman sınırını aşmamak için ilk 10'u alıyoruz
    const usersSnap = await db.collection('users').where('uid', 'in', data.audience.uids.slice(0, 10)).get()
    usersSnap.forEach(d => { const t = d.get('fcmToken'); if (t) tokens.push(t) })
  }

  tokens = Array.from(new Set(tokens))
  if (tokens.length === 0) {
    await snap.ref.update({ status: 'skipped', reason: 'no_tokens', processedAt: admin.firestore.FieldValue.serverTimestamp() })
    return { status: 'skipped', successCount: 0, failureCount: 0 }
  }

  const message = {
    notification: data.notification || { title: 'GlowChocolate', body: '' },
    data: data.data || {},
    tokens
  }

  const res = await admin.messaging().sendEachForMulticast(message)
  await snap.ref.update({ status: 'sent', successCount: res.successCount, failureCount: res.failureCount, processedAt: admin.firestore.FieldValue.serverTimestamp() })
  return { status: 'sent', successCount: res.successCount, failureCount: res.failureCount }
}

// notification_queue'daki yeni kayıtları FCM'e gönder
exports.processNotificationQueue = functions.firestore
  .document('notification_queue/{id}')
  .onCreate(async (snap, context) => {
    try {
      return await processQueueDoc(snap)
    } catch (err) {
      console.error('Queue processing error', err)
      await snap.ref.update({ status: 'failed', error: String(err), processedAt: admin.firestore.FieldValue.serverTimestamp() })
    }
  })

// HTTPS callable: admin kullanıcıdan kuyruga kayıt at
exports.enqueueBroadcast = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth gerekli')
  }
  const uid = context.auth.uid
  // Firestore'da bu kullanıcının admin olduğunu doğrula
  const usersSnap = await db.collection('users').where('uid', '==', uid).limit(1).get()
  if (usersSnap.empty || (usersSnap.docs[0].get('role') !== 'admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Admin değil')
  }
  const payload = data?.payload || {}
  const id = data?.id || `broadcast_${Date.now()}`
  await db.collection('notification_queue').doc(id).set({
    audience: { type: 'all' },
    createdByUid: uid,
    createdByEmail: usersSnap.docs[0].get('email') || null,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    retries: 0,
    ...payload
  }, { merge: true })
  return { success: true, id }
})

// users rolü admin'e dönerse custom claims ile eşitle
exports.syncUserClaims = functions.firestore
  .document('users/{docId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null
    if (!after || !after.uid) return
    const isAdmin = after.role === 'admin'
    try {
      await admin.auth().setCustomUserClaims(after.uid, { admin: isAdmin })
    } catch (e) {
      console.error('setCustomUserClaims error', e)
    }
  })

// HTTPS callable: Admin için mevcut "pending" kayıtları elle işle (backfill)
exports.processPending = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth gerekli')
  }
  const uid = context.auth.uid
  const meSnap = await db.collection('users').where('uid', '==', uid).limit(1).get()
  if (meSnap.empty || (meSnap.docs[0].get('role') !== 'admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Admin değil')
  }

  const id = data?.id || null
  const limit = Math.min(Number(data?.limit) || 20, 100)
  const results = { processed: 0, sent: 0, skipped: 0, failed: 0 }

  if (id) {
    const ref = db.collection('notification_queue').doc(String(id))
    const snap = await ref.get()
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Kayıt bulunamadı')
    }
    try {
      const r = await processQueueDoc(snap)
      results.processed += 1
      if (r.status === 'sent') results.sent += 1
      if (r.status === 'skipped') results.skipped += 1
    } catch (e) {
      console.error('Manual process error', e)
      results.failed += 1
      await snap.ref.update({ status: 'failed', error: String(e), processedAt: admin.firestore.FieldValue.serverTimestamp() })
    }
  } else {
    const q = db.collection('notification_queue').where('status', '==', 'pending').orderBy('createdAt', 'asc').limit(limit)
    const snap = await q.get()
    for (const d of snap.docs) {
      try {
        const r = await processQueueDoc(d)
        results.processed += 1
        if (r.status === 'sent') results.sent += 1
        if (r.status === 'skipped') results.skipped += 1
      } catch (e) {
        console.error('Manual process (loop) error', e)
        results.failed += 1
        await d.ref.update({ status: 'failed', error: String(e), processedAt: admin.firestore.FieldValue.serverTimestamp() })
      }
    }
  }

  return { success: true, ...results }
})
