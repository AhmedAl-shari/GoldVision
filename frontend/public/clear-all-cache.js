// Complete cache clearing script for GoldVision
console.log("🧹 Clearing all GoldVision caches...");

// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Clear IndexedDB
if ("indexedDB" in window) {
  indexedDB.databases().then((databases) => {
    databases.forEach((db) => {
      indexedDB.deleteDatabase(db.name);
      console.log("🗑️ Deleted IndexedDB:", db.name);
    });
  });
}

// Clear service workers
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log("🔄 Unregistered service worker:", registration.scope);
    });
  });
}

// Clear all caches
if ("caches" in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      caches.delete(name);
      console.log("💾 Deleted cache:", name);
    });
  });
}

// Clear cookies for localhost
document.cookie.split(";").forEach((cookie) => {
  const eqPos = cookie.indexOf("=");
  const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  document.cookie =
    name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost";
  document.cookie =
    name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=127.0.0.1";
});

console.log("✅ Cache cleared! Reloading page...");
setTimeout(() => {
  window.location.reload(true);
}, 1000);
