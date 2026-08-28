export async function getHealth() {
  const response = await fetch("/health");

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json();
}