/* global self */
// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyAQVXo0DxYf44hU__zS4XMlrDz5uu6bAQc",
  authDomain: "glowchocolate-534b7.firebaseapp.com",
  projectId: "glowchocolate-534b7",
  storageBucket: "glowchocolate-534b7.firebasestorage.app",
  messagingSenderId: "494243389831",
  appId: "1:494243389831:web:b76f71af742baba3f87322",
})

const messaging = firebase.messaging()

// Background mesajlarda bildirim göster
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'GlowChocolate'
  const options = {
    body: payload?.notification?.body || '',
    icon: '/favicon.svg',
    data: payload?.data || {}
  }
  self.registration.showNotification(title, options)
})
