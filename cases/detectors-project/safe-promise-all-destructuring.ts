async function loadUsers() {
  const users = await Promise.all([
    Promise.resolve<{ name: string } | undefined>(undefined),
  ]);
  const [user] = users;
  console.log(user);
}

void loadUsers();
