importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBN6Jr4WVvPu0c46n5h6xy8zJnn3PMww0A",
  authDomain: "farmacykart-5e3cd.firebaseapp.com",
  projectId: "farmacykart-5e3cd",
  storageBucket: "farmacykart-5e3cd.firebasestorage.app",
  messagingSenderId: "255857506321",
  appId: "1:255857506321:web:2e256cac6663443bced9b0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    payload.notification?.title || payload.data?.title || "New Notification";
  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      payload.data?.description ||
      "",
    icon: payload.notification?.image || payload.data?.image || "/favicon-transparent.png",
    data: {
      url: payload.data?.click_action || "/",
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
