const button = document.getElementById("test-api");
const result = document.getElementById("result");

button.addEventListener("click", async () => {
  const response = await fetch("http://127.0.0.1:8000/");
  const data = await response.json();

  result.textContent = JSON.stringify(data, null, 2);
});
