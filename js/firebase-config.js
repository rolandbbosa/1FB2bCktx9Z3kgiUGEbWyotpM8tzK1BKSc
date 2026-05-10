// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBt-Aw3J7xr8ynjngJOHVR1IIzIOqTSmyQ",
    authDomain: "imageporn-389c1.firebaseapp.com",
    projectId: "imageporn-389c1",
    storageBucket: "imageporn-389c1.firebasestorage.app",
    messagingSenderId: "113697549803",
    appId: "1:113697549803:web:62c23bcdb56e9a4126bdae",
    measurementId: "G-88XMFMEZE8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();
const auth = firebase.auth();

// Firestore Collections
const COLLECTIONS = {
    IMAGES: 'images',
    BANNERS: 'banners',
    USERS: 'users'
};

// Helper functions
async function getCurrentUser() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
            resolve(user);
        });
    });
}

function checkAdminAccess() {
    document.body.style.visibility = 'hidden';
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            document.body.style.visibility = 'visible';
        }
    });
}





// Prevent right-click context menu
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Prevent common developer tool shortcuts
document.addEventListener('keydown', function(e) {
    // F12 - Open Developer Tools
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+Shift+I - Open Developer Tools
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+Shift+J - Open Console
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+Shift+C - Inspect Element
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+U - View Source
    if (e.ctrlKey && e.key === 'U') {
        e.preventDefault();
        return false;
    }
});
