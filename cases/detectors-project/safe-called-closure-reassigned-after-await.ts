async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  function repair() {
    user = { name: "Ada" };
  }

  await Promise.resolve();
  repair();
  console.log(user.name);
}

void printUser(undefined);
