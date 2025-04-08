async function runCommand(
  cmd: string[]
): Promise<{ code: number; output: string; error: string }> {
  const commandName = cmd[0];
  const args = cmd.slice(1);
  const process = new Deno.Command(commandName, {
    args,
    stdout: "piped",
    stderr: "piped",
    cwd: Deno.env.get("NEUTREE_CODE_BASE"),
  });
  const { code, stdout, stderr } = await process.output();
  const output = new TextDecoder().decode(stdout);
  const error = new TextDecoder().decode(stderr);
  return { code, output, error };
}

export async function commitToBranch({
  resource_name,
  files,
}: {
  resource_name: string;
  files: Array<{ path: string; content: string }>;
}) {
  for (const file of files) {
    await Deno.writeTextFile(file.path, file.content);
  }

  const baseBranch = `ai-impl-${resource_name}`;
  let suffix = 0;
  let branchName = baseBranch;
  while (true) {
    const result = await runCommand([
      "git",
      "ls-remote",
      "--heads",
      "origin",
      branchName,
    ]);
    if (result.output.trim() === "") {
      break;
    }
    suffix += 1;
    branchName = `${baseBranch}-${suffix}`;
  }

  for (const command of [
    ["git", "config", "user.name", "neutree-ai-coder"],
    ["git", "config", "user.email", "neutree-ai-coder@arcfra.com"],
    ["git", "checkout", "-b", branchName],
    ["make", "mockgen"],
    ["make", "fmt"],
    ["git", "add", "."],
    [
      "git",
      "commit",
      "-m",
      `feat: (ai-gen) impl the ${resource_name} controller`,
    ],
    ["git", "push", "-u", "origin", branchName],
  ]) {
    const result = await runCommand(command);
    if (result.code) {
      throw new Error(result.error);
    }
  }

  return {
    branchName,
  };
}
