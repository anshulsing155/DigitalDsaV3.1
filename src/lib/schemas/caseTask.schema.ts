// Case Task Zod Schemas
import { z } from 'zod';

export const taskStatusEnum = z.enum(['pending', 'in_progress', 'done', 'cancelled']);
export const taskPriorityEnum = z.enum(['low', 'medium', 'high']);
export const taskSourceEnum = z.enum(['manual', 'system']);

export const taskCreateSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	priority: taskPriorityEnum.default('medium'),
	due_date: z.string().datetime().optional(),
	lender_app_id: z.string().optional()
});

export const taskUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	priority: taskPriorityEnum.optional(),
	status: taskStatusEnum.optional(),
	due_date: z.string().datetime().nullable().optional()
});
