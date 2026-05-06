// Authentication Logic - Login Only (No Signup)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    try {
        // Login only
        await auth.signInWithEmailAndPassword(email, password);
        messageDiv.textContent = 'Login successful! Redirecting...';
        messageDiv.className = 'message success';
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 2000);
    } catch (error) {
        messageDiv.textContent = `Error: ${error.message}`;
        messageDiv.className = 'message error';
    }
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}
