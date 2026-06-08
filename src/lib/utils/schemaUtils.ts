interface SchemaItem {
	bindsTo_template?: string;
	bindsTo?: string;
	questions?: SchemaItem[];
	items?: SchemaItem[];
	[key: string]: unknown;
}

interface SchemaWithPages {
	pages?: SchemaItem[];
	[key: string]: unknown;
}

export function preprocessSchemaBindings(
	schema: SchemaWithPages,
	loanName: string
): SchemaWithPages {
	function processItem(item: SchemaItem): SchemaItem {
		const clone: SchemaItem = { ...item };
		if (clone.bindsTo_template) {
			clone.bindsTo = clone.bindsTo_template.replace('{loanName}', loanName);
			delete clone.bindsTo_template;
		}
		if (clone.questions) {
			clone.questions = clone.questions.map(processItem);
		}
		if (clone.items) {
			clone.items = clone.items.map(processItem);
		}
		return clone;
	}

	const newSchema: SchemaWithPages = { ...schema };
	if (Array.isArray(newSchema.pages)) {
		newSchema.pages = newSchema.pages.map((page) => processItem(page));
	}
	return newSchema;
}
