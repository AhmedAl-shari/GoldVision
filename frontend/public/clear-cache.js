// Force clear all caches and reload
console.log("Clearing all caches...");

// Clear localStorage
localStorage.clear();
sessionStorage.clear();

// Clear service workers
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      registration.unregister();
      console.log("Unregistered service worker:", registration.scope);
    }
  });
}

// Clear caches
if ("caches" in window) {
  caches.keys().then(function (names) {
    for (let name of names) {
      caches.delete(name);
      console.log("Deleted cache:", name);
    }
  });
}

console.log("Cache cleared. Reloading...");
setTimeout(() => {
  window.location.reload(true);
}, 1000);

