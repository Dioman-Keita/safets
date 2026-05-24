async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  async function later() {
    await Promise.resolve();
  }

  later();
  console.log(user.name);
}

void printUser(undefined);
