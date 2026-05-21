async function loadUsers() {
  const [user] = await Promise.all([
    Promise.resolve<{ name: string } | undefined>(undefined),
  ]);

  console.log(user);
}

void loadUsers();
