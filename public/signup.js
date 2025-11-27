document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await response.json();
  const messageDiv = document.getElementById('message');

  if (response.ok) {
    messageDiv.style.color = 'green';
    messageDiv.textContent = data.message;
    // Redirect to dashboard after successful signup
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  } else {
    messageDiv.style.color = 'red';
    messageDiv.textContent = data.error;
  }
});
