import { cac } from 'cac';
import pc from 'picocolors';
import { executeBuild, BuildValidationError } from './commands/build.js';

export async function runCli(argv = process.argv): Promise<void> {
  const cli = cac('agent-engine');

  cli
    .command('build', 'Compile .agents/ canonical core into native target configs')
    .option('-t, --targets <targets>', 'Comma-separated target list (claude, cursor, windsurf, roo, aider, aaif)')
    .option('--dry-run', 'Perform dry-run without writing files to disk')
    .option('--strict', 'Fail build on validation errors or warnings')
    .option('-d, --dir <dir>', 'Root workspace directory', { default: process.cwd() })
    .action(async (options: { targets?: string; dryRun?: boolean; strict?: boolean; dir?: string }) => {
      try {
        console.log(pc.cyan('\n  ◆  Building agent targets from .agents/ ...\n'));

        const targetList = options.targets
          ? options.targets.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined;

        const result = await executeBuild({
          rootDir: options.dir,
          targets: targetList,
          dryRun: options.dryRun,
          strict: options.strict,
        });

        for (let i = 0; i < result.targets.length; i++) {
          const target = result.targets[i];
          const isLast = i === result.targets.length - 1;
          const branch = isLast ? '  └─ ' : '  ├─ ';
          const fileSummary = target.files.map((f) => f.path).join(', ');
          console.log(
            `${branch}${pc.green('✔')} ${pc.bold(target.adapterName.padEnd(20))} -> ${pc.gray(fileSummary)}`
          );
        }

        console.log(
          pc.green(`\n  ✔  Done in ${result.durationMs}ms. Generated ${result.totalFiles} target configuration files.\n`)
        );
      } catch (err: unknown) {
        if (err instanceof BuildValidationError) {
          console.error(pc.red(`\n  ✖  Build failed with validation errors:\n`));
          console.error(pc.yellow(err.message));
        } else if (err instanceof Error) {
          console.error(pc.red(`\n  ✖  Build failed: ${err.message}\n`));
        } else {
          console.error(pc.red('\n  ✖  Build failed with an unknown error.\n'));
        }
        process.exitCode = 1;
      }
    });

  cli.help();
  cli.version('0.1.0');

  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();
}
