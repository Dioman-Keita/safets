const raw = "{";

try {
  JSON.parse(raw);
} catch {
  console.log("ignored");
}
