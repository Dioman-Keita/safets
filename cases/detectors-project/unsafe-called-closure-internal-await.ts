async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  async function later() {
    await Promise.resolve();
    return user.name;
  }

  await later();
}

void printUser(undefined);
