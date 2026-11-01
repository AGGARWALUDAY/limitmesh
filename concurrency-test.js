
const url = "http://localhost:3000/test";

async function runTest() {
  const requests = Array.from({ length: 10 }, (_, i) =>
    fetch(url, {
      headers: {
        "X-Test-IP": `client-${i + 1}`,
      },
    })
  );

  const responses = await Promise.all(requests);

  const allowed = responses.filter(
    (res) => res.status === 200
  ).length;

  const rejected = responses.filter(
    (res) => res.status === 429
  ).length;

  console.log("Total requests:", responses.length);
  console.log("Allowed:", allowed);
  console.log("Rejected:", rejected);
}

runTest();
