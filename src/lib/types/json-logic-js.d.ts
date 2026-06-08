declare module 'json-logic-js' {
	type LogicValue = string | number | boolean | null | LogicObject | LogicValue[];
	interface LogicObject {
		[key: string]: LogicValue;
	}

	interface JsonLogic {
		apply(logic: LogicObject | LogicObject[] | unknown, data?: unknown): unknown;
		add_operation(name: string, func: (...args: unknown[]) => unknown): void;
	}

	const jsonLogic: JsonLogic;

	// Support both default and named exports
	export default jsonLogic;
	export const apply: JsonLogic['apply'];
	export const add_operation: JsonLogic['add_operation'];
}
