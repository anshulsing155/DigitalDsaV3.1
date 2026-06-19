/**
 * Icon Registry - Centralized icon exports for tree-shaking optimization
 *
 * Instead of using `import * as Icons from 'lucide-svelte'` which bundles ALL icons,
 * use this registry which only includes icons actually used in the codebase.
 *
 * For static icon usage: import { IconName } from '$lib/utils/iconRegistry';
 * For dynamic icon lookup: import { getIcon } from '$lib/utils/iconRegistry';
 *
 * NOTE: getIcon() auto-converts kebab-case ("calendar-clock") to PascalCase ("CalendarClock").
 * Schema JSON can use either format.
 */

// Import only the icons actually used in the codebase
import {
	// Navigation & UI
	SquareCheck,
	CircleUserRound,
	Sun,
	Paperclip,
	MoveRight,
	Moon,
	ChartNoAxesCombined,
	CircleOff,
	ChevronLeft,
	ArrowRightLeft,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	TriangleAlert,
	X,
	Menu,
	Home,
	ArrowRight,
	ArrowLeft,
	Play,
	Copy,
	Archive,
	MoveLeft,
	Info,
	ArrowDownAZ,
	ArrowDownWideNarrow,
	ArrowUpWideNarrow,
	MoveUpRight,
	List,
	Loader2,
	Route,
	Target,
	Globe,
	DoorOpen,

	// User & People
	User,
	Users,
	UserPlus,
	UserStar,
	UserRoundCheck,
	CircleUser,
	LogIn,
	LogOut,

	// Status & Feedback
	Circle,
	CircleCheck,
	CircleCheckBig,
	CircleDashed,
	CircleAlert,
	AlertCircle,
	CirclePlus,
	CircleMinus,
	CircleDot,
	Check,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Ban,

	// Search
	Search,

	// Gender icons
	Mars,
	Venus,
	VenusAndMars,

	// Building & Business
	Building,
	Building2,
	Landmark,
	BriefcaseBusiness,
	Fence,
	Construction,
	HardHat,
	Store,
	Stethoscope,
	UserCog,
	PieChart,
	Armchair,
	ShieldCheck,
	ShieldQuestionMark,
	ShieldMinus,
	ShieldX,
	ShieldAlert,
	Wheat,
	Laptop,
	Gavel,
	Factory,
	Castle,
	Cog,
	Monitor,

	// Finance & Money
	Banknote,
	IndianRupee,
	Coins,
	CreditCard,
	Percent,
	TrendingDown,
	TrendingUp,
	Gauge,
	Funnel,
	Wallet,
	HandCoins,
	CircleDollarSign,
	DollarSign,
	PiggyBank,
	Scale,
	Calculator,

	// Transfer & Sync
	ArrowLeftRight,
	RefreshCw,
	Layers,

	// Property & Layout
	TreePine,
	House,
	Milestone,
	LayoutGrid,
	LandPlot,
	PaintBucket,
	Paintbrush,
	SquareDashedBottom,

	// Documents & Files
	Calendar,
	CalendarFold,
	CalendarClock,
	CalendarDays,
	CalendarHeart,
	CalendarRange,
	IdCard,
	FileText,
	File,
	FileCheck,
	FileCheck2,
	FileWarning,
	FileX,
	FileKey,
	FileQuestion,
	Receipt,
	ClipboardList,
	ClipboardCheck,
	Hash,

	// Actions
	Pencil,
	PenLine,
	Trash,
	Trash2,
	Camera,
	ImageDown,
	Download,
	Wrench,

	// Badges & Awards
	Award,
	BadgeCheck,
	MapPinPlusInside,
	FileSpreadsheet,
	Activity,
	UserCheck,
	BadgePlus,
	Star,
	StarOff,
	Trophy,
	GraduationCap,

	// Education & Knowledge
	BookOpen,
	BookOpenCheck,
	School,
	Compass,

	// Contact & Location
	Phone,
	Mail,
	MessageSquarePlus,
	MapPin,
	MapPinned,
	Map,
	Flag,

	// Thumbs (Yes/No)
	ThumbsUp,
	ThumbsDown,

	// Commerce
	ShoppingBag,
	ShoppingCart,
	Package,

	// Misc
	Handshake,
	Waypoints,
	Plus,
	Lightbulb,
	RotateCcw,
	EllipsisVertical,
	UserMinus,
	Shield,
	ShieldOff,
	HelpCircle,
	Lock,
	PersonStanding,
	HandFist,
	Gift,
	AlertOctagon,
	Clock,
	Timer,
	Split,
	CircleSlash2,
	CircleSlash,
	UnfoldHorizontal,
	Briefcase,
	Sprout,
	EqualNot,
	Workflow,
	Tally1,
	Tally2,
	Ruler,
	Loader,
	Heart,
	Infinity,
	Plane,
	Rocket,
	PartyPopper,
	Zap,
	Square,

	//weather
	Droplets,

	// nature
	Mountain,

	// Accounts & access
	KeyRound,

	// Dev / QA
	FlaskConical,

	// Submission / confirm-modal redesign (LEND-1 stack pop, 2026-06-02)
	Send,
} from 'lucide-svelte';

// Re-export all icons for direct imports
export {
	Square,
	SquareCheck,
	CircleUserRound,
	Sun,
	Paperclip,
	MoveRight,
	Moon,
	ChartNoAxesCombined,
	CircleOff,
	ChevronLeft,
	ArrowRightLeft,
	TriangleAlert,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	X,
	Menu,
	Home,
	ArrowRight,
	ArrowLeft,
	Play,
	Copy,
	Archive,
	MoveLeft,
	Info,
	ArrowDownAZ,
	ArrowDownWideNarrow,
	ArrowUpWideNarrow,
	MoveUpRight,
	List,
	Loader2,
	Route,
	Target,
	User,
	Users,
	UserPlus,
	UserStar,
	UserRoundCheck,
	CircleUser,
	LogIn,
	LogOut,
	Circle,
	CircleCheck,
	CircleCheckBig,
	CircleDashed,
	CircleAlert,
	AlertCircle,
	CirclePlus,
	CircleMinus,
	CircleDot,
	Check,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Ban,
	Search,
	Mars,
	Venus,
	Building,
	Building2,
	Landmark,
	BriefcaseBusiness,
	Fence,
	Construction,
	HardHat,
	Store,
	Stethoscope,
	UserCog,
	PieChart,
	Armchair,
	ShieldCheck,
	ShieldX,
	ShieldMinus,
	ShieldAlert,
	ShieldQuestionMark,
	Wheat,
	Laptop,
	Gavel,
	Factory,
	Castle,
	Cog,
	Monitor,
	Banknote,
	IndianRupee,
	Coins,
	CreditCard,
	Percent,
	TrendingDown,
	TrendingUp,
	Gauge,
	Funnel,
	Wallet,
	HandCoins,
	CircleDollarSign,
	DollarSign,
	PiggyBank,
	Scale,
	Calculator,
	ArrowLeftRight,
	RefreshCw,
	Layers,
	TreePine,
	House,
	Milestone,
	LayoutGrid,
	LandPlot,
	PaintBucket,
	Paintbrush,
	SquareDashedBottom,
	Calendar,
	CalendarFold,
	CalendarClock,
	CalendarDays,
	CalendarHeart,
	CalendarRange,
	IdCard,
	FileText,
	File,
	FileCheck,
	FileCheck2,
	FileWarning,
	FileX,
	FileKey,
	FileQuestion,
	Receipt,
	ClipboardList,
	ClipboardCheck,
	Hash,
	Pencil,
	PenLine,
	Trash,
	Trash2,
	Camera,
	ImageDown,
	Download,
	Wrench,
	Award,
	BadgeCheck,
	MapPinPlusInside,
	FileSpreadsheet,
	Activity,
	UserCheck,
	Globe,
	BadgePlus,
	Star,
	StarOff,
	Trophy,
	GraduationCap,
	BookOpen,
	BookOpenCheck,
	School,
	Compass,
	Phone,
	Mail,
	MessageSquarePlus,
	MapPin,
	MapPinned,
	Map,
	Flag,
	ThumbsUp,
	ThumbsDown,
	ShoppingBag,
	ShoppingCart,
	Package,
	Handshake,
	Waypoints,
	Plus,
	Lightbulb,
	RotateCcw,
	EllipsisVertical,
	UserMinus,
	Shield,
	ShieldOff,
	HelpCircle,
	Lock,
	Rocket,
	Zap,
	Timer,
	Clock,
	FlaskConical,
	Send,
	Heart
};

// Icon registry for dynamic lookups
// Keys are PascalCase icon names as used in the codebase
const iconRegistry: Record<string, typeof User> = {
	// Navigation & UI
	SquareCheck,
	CircleUserRound,
	Sun,
	Paperclip,
	MoveRight,
	Moon,
	ChartNoAxesCombined,
	CircleOff,
	ChevronLeft,
	ArrowRightLeft,
	TriangleAlert,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	X,
	Menu,
	Home,
	ArrowRight,
	MoveLeft,
	Info,
	ArrowDownAZ,
	ArrowDownWideNarrow,
	ArrowUpWideNarrow,
	MoveUpRight,
	List,
	Loader2,
	Route,
	Target,
	ShieldOff,
	Ruler,
	Sprout,
	EqualNot,
	Briefcase,
	PersonStanding,
	HandFist,
	CircleSlash,
	Workflow,
	Gift,
	Split,
	FileQuestion,
	Clock,
	Timer,
	Tally1,
	Tally2,
	CircleSlash2,
	UnfoldHorizontal,
	AlertOctagon,
	DoorOpen,

	// User & People
	User,
	Users,
	UserPlus,
	UserStar,
	UserRoundCheck,
	CircleUser,
	LogIn,
	LogOut,

	// Status & Feedback
	Circle,
	CircleCheck,
	CircleCheckBig,
	CircleDashed,
	CircleAlert,
	AlertCircle,
	CirclePlus,
	CircleMinus,
	CircleDot,
	Check,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Ban,

	// Search
	Search,

	// Gender icons
	Mars,
	Venus,
	VenusAndMars, // Alias for gender field

	// Building & Business
	Building,
	Building2,
	Landmark,
	BriefcaseBusiness,
	Fence,
	Construction,
	HardHat,
	Store,
	Stethoscope,
	UserCog,
	PieChart,
	Armchair,
	ShieldCheck,
	ShieldQuestionMark,
	ShieldX,
	ShieldMinus,
	ShieldAlert,
	Wheat,
	Laptop,
	Gavel,
	Factory,
	Castle,
	Cog,
	Monitor,

	// Finance & Money
	Banknote,
	IndianRupee,
	Coins,
	CreditCard,
	Percent,
	TrendingDown,
	TrendingUp,
	Gauge,
	Funnel,
	Wallet,
	HandCoins,
	CircleDollarSign,
	DollarSign,
	PiggyBank,
	Scale,
	Calculator,

	// Transfer & Sync
	ArrowLeftRight,
	RefreshCw,
	Layers,

	// Property & Layout
	TreePine,
	House,
	Milestone,
	LayoutGrid,
	LandPlot,
	PaintBucket,
	Paintbrush,
	SquareDashedBottom,

	// Documents & Files
	Calendar,
	CalendarFold,
	CalendarClock,
	CalendarDays,
	CalendarHeart,
	CalendarRange,
	IdCard,
	FileText,
	File,
	FileCheck,
	FileCheck2,
	FileWarning,
	FileX,
	FileKey,
	Receipt,
	ClipboardList,
	ClipboardCheck,
	Hash,

	// Actions
	Pencil,
	PenLine,
	Trash,
	Trash2,
	Camera,
	ImageDown,
	Download,
	Wrench,

	// Badges & Awards
	Award,
	BadgeCheck,
	MapPinPlusInside,
	FileSpreadsheet,
	Activity,
	UserCheck,
	Globe,
	BadgePlus,
	Star,
	StarOff,
	Trophy,
	GraduationCap,

	// Education & Knowledge
	BookOpen,
	BookOpenCheck,
	School,
	Compass,

	// Contact & Location
	Phone,
	Mail,
	MapPin,
	MapPinned,
	Map,
	Flag,

	// Thumbs (Yes/No)
	ThumbsUp,
	ThumbsDown,

	// Commerce
	ShoppingBag,
	ShoppingCart,
	Package,

	// Misc
	Handshake,
	Waypoints,
	Plus,
	Lightbulb,
	RotateCcw,
	EllipsisVertical,
	UserMinus,
	Shield,
	HelpCircle,
	Lock,
	Loader,
	Heart,
	Infinity,
	Plane,
	Rocket,
	PartyPopper,
	Zap,
	Square,

	// ── Aliases for renamed icons (older schema references → current Lucide names) ──
	CheckCircle: CircleCheck,
	MinusCircle: CircleMinus,
	UserCircle: CircleUser,
	BoxSelect: SquareDashedBottom,

	// weather
	Droplets,

	// nature
	Mountain,

	// Accounts & access
	KeyRound,

	// Submission / confirm-modal redesign (LEND-1 stack pop, 2026-06-02)
	Send
};

/**
 * Convert kebab-case or snake_case to PascalCase
 * "calendar-clock" → "CalendarClock"
 * "file-check-2" → "FileCheck2"
 */
function toPascalCase(str: string): string {
	return str.replace(/(^|[-_])(\w)/g, (_, _sep, c) => c.toUpperCase());
}

/**
 * Get an icon component by name.
 * Accepts PascalCase ("CalendarClock") or kebab-case ("calendar-clock").
 * Returns undefined if icon not found in registry.
 *
 * @example
 * const IconComponent = getIcon('User');
 * const IconComponent2 = getIcon('calendar-clock');
 */
export function getIcon(name: string): typeof User | undefined {
	// Direct lookup first (PascalCase)
	if (iconRegistry[name]) return iconRegistry[name];
	// Try converting kebab/snake-case to PascalCase
	const pascal = toPascalCase(name);
	return iconRegistry[pascal];
}

/**
 * Check if an icon exists in the registry
 */
export function hasIcon(name: string): boolean {
	if (name in iconRegistry) return true;
	return toPascalCase(name) in iconRegistry;
}

// Export the registry for components that need direct access
export { iconRegistry };
