
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/test-health', {
      method: 'GET'
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
