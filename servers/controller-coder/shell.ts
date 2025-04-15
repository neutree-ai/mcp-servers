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

export async function formatWorkspace() {
  const commands = [
    ["make", "mockgen"],
    ["make", "fmt"],
    // ["make", "lint"],
  ];

  for (const command of commands) {
    const result = await runCommand(command);
    if (result.code) {
      throw new Error(
        `Command failed: ${command.join(" ")}\nError: ${JSON.stringify(result)}`
      );
    }
  }
}

export async function commitToBranch({
  resource_name,
  files,
}: {
  resource_name: string;
  files: Array<{ path: string; content: string }>;
}) {
  const baseBranch = `ai-impl-${resource_name}`;
  let suffix = 0;
  let branchName = baseBranch;

  while (true) {
    const remoteResult = await runCommand([
      "git",
      "ls-remote",
      "--heads",
      "origin",
      branchName,
    ]);

    const localResult = await runCommand([
      "git",
      "branch",
      "--list",
      branchName,
    ]);

    if (remoteResult.output.trim() === "" && localResult.output.trim() === "") {
      break;
    }

    suffix += 1;
    branchName = `${baseBranch}-${suffix}`;
  }

  const preCommands = [
    ["git", "config", "user.name", "neutree-ai-coder"],
    ["git", "config", "user.email", "neutree-ai-coder@arcfra.com"],
    ["git", "reset", "--hard"],
    ["git", "clean", "-f"],
    ["git", "checkout", "-b", branchName],
  ];

  for (const command of preCommands) {
    const result = await runCommand(command);
    if (result.code) {
      throw new Error(
        `Pre-command failed: ${command.join(" ")}\nError: ${JSON.stringify(
          result
        )}`
      );
    }
  }

  for (const file of files) {
    await Deno.writeTextFile(file.path, file.content);
  }

  await formatWorkspace();

  const commands = [
    ["git", "add", "."],
    [
      "git",
      "commit",
      "-m",
      `feat: (ai-gen) impl the ${resource_name} controller`,
    ],
    ["git", "push", "-u", "origin", branchName],
  ];

  for (const command of commands) {
    const result = await runCommand(command);
    if (result.code) {
      throw new Error(
        `Command failed: ${command.join(" ")}\nError: ${JSON.stringify(result)}`
      );
    }
  }

  return {
    branchName,
  };
}
