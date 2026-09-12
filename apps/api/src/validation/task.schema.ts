import { z } from "zod";
import { TaskStatus, TaskPriority } from "@prisma/client";

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  assignedDeveloperId: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid due date format (must be valid ISO date)",
  }),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  assignedDeveloperId: z.string().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid due date format",
    })
    .optional(),
}).strict();

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus, {
    errorMap: () => ({ message: "Status must be TODO, IN_PROGRESS, IN_REVIEW, or DONE" }),
  }),
});

export const listTasksQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueFrom: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid dueFrom date" })
    .optional(),
  dueTo: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid dueTo date" })
    .optional(),
  projectId: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
