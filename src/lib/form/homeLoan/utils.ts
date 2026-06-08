import type { Option, Answers, DynamicLabel } from '$lib/types/formTypes';

export function resolveOptionLabel(opt: Option, answers: Answers): string {
	if (typeof opt.label === 'object' && 'var' in opt.label) {
		const dynamicLabel = opt.label as DynamicLabel;
		return answers[dynamicLabel.var]?.toString() || dynamicLabel.var;
	}
	return opt.label as string;
}
