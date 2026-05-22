async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  function later() {
    return user.name;
  }

  await Promise.resolve();
  later();
}

void printUser(undefined);
