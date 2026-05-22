const res = await fetch('http://localhost:9090/api/v1/auth/user/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin', password: 'admin123' })
});
console.log(res.status, await res.text());
