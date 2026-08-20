import { cac } from 'cac';
import pc from 'picocolors';
import { executeBuild, BuildValidationError } from './commands/build.js';
import { executeInit, InitConflictError } from './commands/init.js';
import {
  executeSkillAdd,
  executeSkillCreate,
  executeSkillList,
  executeSkillRemove,
} from './commands/skill.js';
import { SkillError } from './skills/resolver.js';

export async function runCli(argv = process.argv): Promise<void> {
  const cli = cac('agent-engine');

  // init command
  cli
    .command('init [dir]', 'Scaffold a new canonical .agents/ workspace with interactive wizard')
    .option('-y, --yes', 'Skip prompts and accept default settings')
    .option('-t, --targets <targets>', 'Comma-separated target list (claude, cursor, windsurf, roo, aider, aaif)')
    .option('-n, --name <name>', 'Project name')
    .option('--description <description>', 'Project description')
    .option('--template <template>', 'Template preset')
    .option('--package-manager <pm>', 'Package manager (pnpm, npm, yarn, bun)')
    .option('-f, --force', 'Overwrite existing .agents directory without prompting')
    .option('--dry-run', 'Preview scaffolding without writing to disk')
    .option('--no-build', 'Skip automatic target transpilation build step')
    .option('-d, --dir <dir>', 'Root workspace directory', { default: process.cwd() })
    .action(
      async (
        dir: string | undefined,
        options: {
          yes?: boolean;
          targets?: string;
          name?: string;
          description?: string;
          template?: string;
          packageManager?: string;
          force?: boolean;
          dryRun?: boolean;
          build?: boolean;
          noBuild?: boolean;
          dir?: string;
        }
      ) => {
        try {
          const rootDir = dir || options.dir || process.cwd();
          const noBuild = options.build === false || options.noBuild === true;

          const result = await executeInit({
            rootDir,
            yes: options.yes,
            targets: options.targets,
            name: options.name,
            description: options.description,
            template: options.template,
            packageManager: options.packageManager,
            force: options.force,
            dryRun: options.dryRun,
            noBuild,
          });

          console.log(pc.cyan(`\n  ◆  Canonical agent workspace initialized in ${pc.bold(result.rootDir)}\n`));
          for (let i = 0; i < result.scaffoldedFiles.length; i++) {
            const file = result.scaffoldedFiles[i];
            const isLast = i === result.scaffoldedFiles.length - 1 && !result.buildResult;
            const branch = isLast ? '  └─ ' : '  ├─ ';
            console.log(`${branch}${pc.green('✔')} created: ${pc.gray(file)}`);
          }

          if (result.buildResult) {
            console.log(
              pc.green(
                `\n  ✔  Generated ${result.buildResult.totalFiles} native adapter config files across ${result.buildResult.targets.length} targets.\n`
              )
            );
          }
        } catch (err: unknown) {
          if (err instanceof InitConflictError) {
            console.error(pc.red(`\n  ✖  Initialization conflict: ${err.message}\n`));
          } else if (err instanceof BuildValidationError) {
            console.error(pc.red(`\n  ✖  Build failed with validation errors:\n`));
            console.error(pc.yellow(err.message));
          } else if (err instanceof Error) {
            console.error(pc.red(`\n  ✖  Initialization failed: ${err.message}\n`));
          } else {
            console.error(pc.red('\n  ✖  Initialization failed with an unknown error.\n'));
          }
          process.exitCode = 1;
        }
      }
    );

  // build command
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

  // skill command (subcommand dispatcher)
  cli
    .command('skill [action] [target]', 'Manage agent skills (list, add, create, remove)')
    .alias('skills')
    .option('--name <name>', 'Override destination skill name')
    .option('--description <description>', 'Skill description')
    .option('--version <version>', 'Skill semver version', { default: '1.0.0' })
    .option('--template <template>', 'Template type (progressive, standard, minimal)', { default: 'progressive' })
    .option('--catalog', 'Include available community catalog skills in output')
    .option('-d, --dir <dir>', 'Root workspace directory', { default: process.cwd() })
    .option('-f, --force', 'Overwrite existing skill if already present')
    .option('-b, --build', 'Trigger automatic configuration rebuild')
    .option('-t, --targets <targets>', 'Comma-separated build targets')
    .action(
      async (
        action: string | undefined,
        target: string | undefined,
        options: {
          name?: string;
          description?: string;
          version?: string;
          template?: 'progressive' | 'standard' | 'minimal';
          catalog?: boolean;
          dir?: string;
          force?: boolean;
          build?: boolean;
          targets?: string;
        }
      ) => {
        try {
          const act = (action || 'list').toLowerCase();
          const rootDir = options.dir || process.cwd();
          const targetList = options.targets
            ? options.targets.split(',').map((t) => t.trim()).filter(Boolean)
            : undefined;

          if (act === 'list' || act === 'ls') {
            console.log(pc.cyan('\n  ◆  Installed Agent Skills (.agents/skills/)\n'));
            const result = await executeSkillList({
              rootDir,
              includeCatalog: options.catalog,
            });

            if (result.skills.length === 0) {
              console.log(pc.gray('  (No skills currently installed in workspace)\n'));
            } else {
              for (let i = 0; i < result.skills.length; i++) {
                const skill = result.skills[i];
                const isLast = i === result.skills.length - 1 && !result.catalog;
                const branch = isLast ? '  └─ ' : '  ├─ ';
                const statusIcon = skill.valid ? pc.green('✔') : pc.red('✖');
                const versionStr = skill.version ? pc.gray(`(v${skill.version})`) : '';
                console.log(
                  `${branch}${statusIcon} ${pc.bold(skill.name.padEnd(24))} ${versionStr} -> ${pc.gray(skill.description || 'No description')}`
                );
              }
            }

            if (result.catalog && result.catalog.length > 0) {
              console.log(pc.cyan('\n  ◆  Available Community Catalog Skills\n'));
              for (let i = 0; i < result.catalog.length; i++) {
                const cat = result.catalog[i];
                const isLast = i === result.catalog.length - 1;
                const branch = isLast ? '  └─ ' : '  ├─ ';
                const statusStr = cat.installed ? pc.green('[installed]') : pc.gray('[available]');
                console.log(
                  `${branch}${statusStr} ${pc.bold(cat.name.padEnd(24))} (v${cat.version}) -> ${pc.gray(cat.description)}`
                );
              }
            }
            console.log('');
            return;
          }

          if (act === 'add') {
            const skillSource = target;
            if (!skillSource) {
              console.error(pc.red('\n  ✖  Missing skill name or source. Usage: agent-engine skill add <nameOrSource>\n'));
              process.exitCode = 1;
              return;
            }

            console.log(pc.cyan(`\n  ◆  Installing skill "${skillSource}" ...\n`));
            const result = await executeSkillAdd({
              nameOrSource: skillSource,
              name: options.name,
              rootDir,
              force: options.force,
              build: options.build,
              targets: targetList,
            });

            console.log(pc.green(`  ✔  Skill "${result.name}" successfully installed -> ${pc.gray(result.path)}`));
            if (result.buildResult) {
              console.log(
                pc.green(`  ✔  Rebuilt ${result.buildResult.totalFiles} target adapter files in ${result.buildResult.durationMs}ms.`)
              );
            }
            console.log('');
            return;
          }

          if (act === 'create') {
            const skillName = target;
            if (!skillName) {
              console.error(pc.red('\n  ✖  Missing skill name. Usage: agent-engine skill create <name>\n'));
              process.exitCode = 1;
              return;
            }

            console.log(pc.cyan(`\n  ◆  Scaffolding custom skill "${skillName}" ...\n`));
            const result = await executeSkillCreate({
              name: skillName,
              description: options.description,
              version: options.version,
              template: options.template,
              rootDir,
              force: options.force,
              build: options.build,
              targets: targetList,
            });

            console.log(pc.green(`  ✔  Created skill "${result.name}" (v${result.version}) -> ${pc.gray(result.path)}`));
            if (result.buildResult) {
              console.log(
                pc.green(`  ✔  Rebuilt ${result.buildResult.totalFiles} target adapter files in ${result.buildResult.durationMs}ms.`)
              );
            }
            console.log('');
            return;
          }

          if (act === 'remove' || act === 'rm') {
            const skillName = target;
            if (!skillName) {
              console.error(pc.red('\n  ✖  Missing skill name. Usage: agent-engine skill remove <name>\n'));
              process.exitCode = 1;
              return;
            }

            console.log(pc.cyan(`\n  ◆  Removing skill "${skillName}" ...\n`));
            const result = await executeSkillRemove({
              name: skillName,
              rootDir,
              build: options.build,
              targets: targetList,
            });

            console.log(pc.green(`  ✔  Removed skill "${result.name}"`));
            for (const p of result.removedPaths) {
              console.log(pc.gray(`     deleted: ${p}`));
            }
            if (result.buildResult) {
              console.log(
                pc.green(`  ✔  Rebuilt ${result.buildResult.totalFiles} target adapter files in ${result.buildResult.durationMs}ms.`)
              );
            }
            console.log('');
            return;
          }

          console.error(pc.red(`\n  ✖  Unknown skill action "${act}". Available actions: list, add, create, remove\n`));
          process.exitCode = 1;
        } catch (err: unknown) {
          if (err instanceof SkillError || err instanceof Error) {
            console.error(pc.red(`\n  ✖  Skill error: ${err.message}\n`));
          } else {
            console.error(pc.red('\n  ✖  Skill error with an unknown failure.\n'));
          }
          process.exitCode = 1;
        }
      }
    );

  cli.help();
  cli.version('0.1.0');

  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();
}
