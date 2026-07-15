// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBS5u3P4_CdWRp1kJDlWF-QtgfEeyBgztE",
  authDomain: "studybuddy-393f1.firebaseapp.com",
  projectId: "studybuddy-393f1",
  storageBucket: "studybuddy-393f1.firebasestorage.app",
  messagingSenderId: "184613795055",
  appId: "1:184613795055:web:7b9f6853d913fb047b171a",
  measurementId: "G-Q9EJ71TV0E"
});

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'StudyBuddy';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'studybuddy-notification',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Handle different notification types
  const data = event.notification.data || {};
  
  if (data.studyPlanId) {
    // Open the study plan detail page
    event.waitUntil(
      clients.openWindow(`/study-plan/${data.studyPlanId}`)
    );
  } else {
    // Open the main dashboard
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
