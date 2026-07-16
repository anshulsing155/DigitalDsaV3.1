const log = (level: string, ...args: any[]) => {
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] [${level.toUpperCase()}]`, ...args);
};

export const logger = {
	debug: (...args: any[]) => log('debug', ...args),
	info: (...args: any[]) => log('info', ...args),
	warn: (...args: any[]) => log('warn', ...args),
	error: (...args: any[]) => log('error', ...args)
};

export default logger;
