const url = "http://localhost:3000/test";
const clientIP = "sliding-log-expiry-test";

async function sendRequest() {
  const response = await fetch(url, {
    headers: {
      "X-Test-IP": clientIP,
    },
  });

  console.log("Status:", response.status);
  return response.status;
}

async function runTest() {
  console.log("\n--- Sending first 5 requests ---");

  for (let i = 1; i <= 5; i++) {
    console.log(`Request ${i}:`);
    await sendRequest();
  }

  console.log("\n--- Sending 6th request immediately ---");

  const sixthRequest = await sendRequest();

  console.log(
    sixthRequest === 429
      ? "PASS: 6th request was rejected."
      : "FAIL: Expected 429."
  );

  console.log("\n--- Waiting 11 seconds for expiration ---");

  await new Promise((resolve) => setTimeout(resolve, 11000));

  console.log("\n--- Sending request after expiration ---");

  const afterExpiration = await sendRequest();

  console.log(
    afterExpiration === 200
      ? "PASS: Request allowed after expiration."
      : "FAIL: Expected 200."
  );
}

runTest().catch(console.error);
