# The 9 Patterns

SafeTS detects nine crash patterns that TypeScript's own checker allows even with `strict: true`.

## 1. Unsafe property access `HIGH`

Accessing a property on a value that may be `null` or `undefined`.

```ts
// TypeScript: ✓ OK
// SafeTS: ✗ HIGH
function getEmail(user: User | undefined) {
  return user.profile.email; // crashes if user is undefined
}
```

**Fix:**
```ts
return user?.profile?.email;
// or
if (!user?.profile) return null;
return user.profile.email;
```

---

## 2. Unsafe destructuring `HIGH`

Destructuring from a nullable value.

```ts
// TypeScript: ✓ OK
// SafeTS: ✗ HIGH
const { name, email } = getUser(); // crashes if getUser() returns undefined
```

**Fix:**
```ts
const user = getUser();
if (!user) return;
const { name, email } = user;
```

---

## 3. Unsafe array index access `HIGH`

Accessing a property on an array element that may be `undefined`.

```ts
// TypeScript: ✓ OK
// SafeTS: ✗ HIGH
const first = items[0].name; // crashes if array is empty
```

**Fix:**
```ts
const first = items[0]?.name;
// or
if (!items[0]) return;
const first = items[0].name;
```

---

## 4. Unprotected JSON.parse `HIGH`

Calling `JSON.parse` without a `try/catch`.

```ts
// TypeScript: ✓ OK
// SafeTS: ✗ HIGH
const config = JSON.parse(rawContent); // throws SyntaxError on invalid JSON
```

**Fix:**
```ts
try {
  const config = JSON.parse(rawContent);
} catch (e) {
  // handle malformed JSON
}
```

---

## 5. Unsafe process.env access `HIGH`

Using `process.env` variables without checking if they are defined.

```ts
// TypeScript: ✓ OK
// SafeTS: ✗ HIGH
const port = process.env.PORT.toString(); // crashes if PORT is not set
```

**Fix:**
```ts
const port = process.env.PORT ?? "3000";
// or validate at startup
if (!process.env.PORT) throw new Error("PORT is required");
```

---

## 6. Non-null assertion on nullable `MEDIUM`

Using `!` to suppress a TypeScript error on a nullable value.

```ts
// TypeScript: ✓ OK (you told it to trust you)
// SafeTS: ✗ MEDIUM
const value = map.get("key")!.toUpperCase(); // crashes if key doesn't exist
```

**Fix:**
```ts
const value = map.get("key")?.toUpperCase();
// or
const raw = map.get("key");
if (!raw) return;
const value = raw.toUpperCase();
```

---

## 7. Unsafe access after await `MEDIUM`

Accessing a narrowed variable after an `await` — TypeScript's narrowing is stale after suspension.

```ts
// TypeScript: ✓ OK
// SafeTS: ✗ MEDIUM
async function process(user: User | null) {
  if (!user) return;
  await saveToDatabase(); // external state may change here
  sendEmail(user.email);  // user may be null again
}
```

**Fix:**
```ts
if (!user) return;
await saveToDatabase();
if (!user) return; // re-check after await
sendEmail(user.email);
```

---

## 8. Unsafe Promise.all destructuring `MEDIUM`

Destructuring `Promise.all` results when elements may be `undefined`.

```ts
// TypeScript: ✓ OK
// SafeTS: ✗ MEDIUM
const [user, settings] = await Promise.all([
  getUser(id),
  getSettings(id),
]);
user.name; // crashes if getUser() resolves to undefined
```

**Fix:**
```ts
const [user, settings] = await Promise.all([getUser(id), getSettings(id)]);
if (!user || !settings) return;
```

---

## 9. Unsafe Map/Record access `HIGH`

Accessing a value from a `Map` or `Record` without checking if the key exists.

```ts
// TypeScript: ✓ OK
// SafeTS: ✗ HIGH
const cache = new Map<string, User>();
cache.get("user-1").name; // crashes if key doesn't exist
```

**Fix:**
```ts
const user = cache.get("user-1");
if (!user) return;
user.name;
```
