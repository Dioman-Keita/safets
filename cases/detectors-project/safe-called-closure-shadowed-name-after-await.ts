async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  {
    function later() {
      return "safe";
    }

    await Promise.resolve();
    later();
  }

  {
    function later() {
      return user.name;
    }

    console.log(later);
  }
}

void printUser(undefined);
