async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  function later() {
    function readName() {
      return user.name;
    }

    return readName();
  }

  await Promise.resolve();
  later();
}

void printUser(undefined);
