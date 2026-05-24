async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  await Promise.resolve();

  function later() {
    return user.name;
  }

  console.log(later);
}

void printUser(undefined);
