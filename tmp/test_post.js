
async function test() {
  const payload = {
    messages: [
      { role: 'user', content: 'create a task to clean my room' }
    ],
    sessionId: 'test-session-id',
    isDemoMode: false,
    posture: 'vance',
    lockedIdentity: 'vance',
    identityDna: {
      ruby: { name: 'Anya', role: 'Therapist', directives: 'Be kind.' },
      vance: { name: 'Vance', role: 'Strategist', directives: 'Be efficient.' },
      kael: { name: 'Kael', role: 'Mentor', directives: 'Be creative.' }
    },
    accessPermissions: { operations: true, finances: true, studio: true },
    confirmed: false
  };

  try {
    console.log('Sending POST request...');
    const res = await fetch('http://localhost:3000/api/ai/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response JSON:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
