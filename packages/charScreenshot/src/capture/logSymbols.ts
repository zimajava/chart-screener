import chalk from 'chalk';

interface LogSymbols {
    readonly info: string;
    readonly success: string;
    readonly warning: string;
    readonly error: string;
};

const main = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✔'),
    warning: chalk.yellow('⚠'),
    error: chalk.red('✖')
};

export const logSymbols: LogSymbols = main;
