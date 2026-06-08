export interface Option {
	label: string;
	value: string | number;
	/** When true, this option is mutually exclusive with all non-exclusive options. */
	exclusive?: boolean;
	/** Helper text shown below the label in smaller font */
	description?: string;
	/** Icon name from iconRegistry (e.g. 'Factory', 'Briefcase') */
	icon?: string;
}
