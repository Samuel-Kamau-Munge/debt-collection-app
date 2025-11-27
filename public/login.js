document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  const messageDiv = document.getElementById('message');

  if (response.ok) {
    messageDiv.style.color = 'green';
    messageDiv.textContent = data.message;
    // Store the token in localStorage
    localStorage.setItem('token', data.token);
    // Redirect to main dashboard after successful login
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 500);
  } else {
    messageDiv.style.color = 'red';
    messageDiv.textContent = data.error;
  }
});
