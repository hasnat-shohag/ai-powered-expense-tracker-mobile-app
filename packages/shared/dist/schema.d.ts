import { z } from "zod";
/** Capture source. */
export declare const sourceSchema: z.ZodEnum<["text", "image", "voice"]>;
export type Source = z.infer<typeof sourceSchema>;
/** Sync operation kind for the outbox. */
export declare const opSchema: z.ZodEnum<["create", "update", "delete"]>;
export type Op = z.infer<typeof opSchema>;
/**
 * One expense as returned by the LLM parse step.
 *
 * The model does NOT invent ids, group ids, or store-time timestamps — the
 * backend injects those. `spentAt` is an absolute ISO-8601 UTC instant that the
 * model resolves using the current time + timezone injected into the prompt.
 */
export declare const parsedExpenseSchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    category: z.ZodString;
    merchant: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    paymentMethod: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    spentAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amount: number;
    currency: string;
    category: string;
    merchant: string;
    description: string;
    paymentMethod: string | null;
    spentAt: string;
}, {
    amount: number;
    category: string;
    spentAt: string;
    currency?: string | undefined;
    merchant?: string | undefined;
    description?: string | undefined;
    paymentMethod?: string | null | undefined;
}>;
export type ParsedExpense = z.infer<typeof parsedExpenseSchema>;
/** LLM parse output: always an array (a receipt with N line items → N rows). */
export declare const parseResultSchema: z.ZodArray<z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    category: z.ZodString;
    merchant: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    paymentMethod: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    spentAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amount: number;
    currency: string;
    category: string;
    merchant: string;
    description: string;
    paymentMethod: string | null;
    spentAt: string;
}, {
    amount: number;
    category: string;
    spentAt: string;
    currency?: string | undefined;
    merchant?: string | undefined;
    description?: string | undefined;
    paymentMethod?: string | null | undefined;
}>, "many">;
export type ParseResult = z.infer<typeof parseResultSchema>;
/**
 * Canonical expense row shared by app + backend. Timestamps are ISO-8601 UTC
 * strings on the wire; the DB layer maps them to `timestamptz`.
 */
export declare const expenseSchema: z.ZodObject<{
    id: z.ZodString;
    groupId: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    category: z.ZodString;
    merchant: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    paymentMethod: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    source: z.ZodEnum<["text", "image", "voice"]>;
    rawInput: z.ZodDefault<z.ZodString>;
    receiptKey: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    spentAt: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    deletedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    groupId: string;
    amount: number;
    currency: string;
    category: string;
    merchant: string;
    description: string;
    paymentMethod: string | null;
    source: "text" | "image" | "voice";
    rawInput: string;
    receiptKey: string | null;
    spentAt: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}, {
    id: string;
    groupId: string;
    amount: number;
    category: string;
    source: "text" | "image" | "voice";
    spentAt: string;
    createdAt: string;
    updatedAt: string;
    currency?: string | undefined;
    merchant?: string | undefined;
    description?: string | undefined;
    paymentMethod?: string | null | undefined;
    rawInput?: string | undefined;
    receiptKey?: string | null | undefined;
    deletedAt?: string | null | undefined;
}>;
export type Expense = z.infer<typeof expenseSchema>;
/** A single push operation drained from the mobile outbox. */
export declare const syncPushOpSchema: z.ZodObject<{
    op: z.ZodEnum<["create", "update", "delete"]>;
    expense: z.ZodObject<{
        id: z.ZodString;
        groupId: z.ZodString;
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        category: z.ZodString;
        merchant: z.ZodDefault<z.ZodString>;
        description: z.ZodDefault<z.ZodString>;
        paymentMethod: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        source: z.ZodEnum<["text", "image", "voice"]>;
        rawInput: z.ZodDefault<z.ZodString>;
        receiptKey: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        spentAt: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        deletedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        groupId: string;
        amount: number;
        currency: string;
        category: string;
        merchant: string;
        description: string;
        paymentMethod: string | null;
        source: "text" | "image" | "voice";
        rawInput: string;
        receiptKey: string | null;
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }, {
        id: string;
        groupId: string;
        amount: number;
        category: string;
        source: "text" | "image" | "voice";
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        currency?: string | undefined;
        merchant?: string | undefined;
        description?: string | undefined;
        paymentMethod?: string | null | undefined;
        rawInput?: string | undefined;
        receiptKey?: string | null | undefined;
        deletedAt?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    op: "create" | "update" | "delete";
    expense: {
        id: string;
        groupId: string;
        amount: number;
        currency: string;
        category: string;
        merchant: string;
        description: string;
        paymentMethod: string | null;
        source: "text" | "image" | "voice";
        rawInput: string;
        receiptKey: string | null;
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    };
}, {
    op: "create" | "update" | "delete";
    expense: {
        id: string;
        groupId: string;
        amount: number;
        category: string;
        source: "text" | "image" | "voice";
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        currency?: string | undefined;
        merchant?: string | undefined;
        description?: string | undefined;
        paymentMethod?: string | null | undefined;
        rawInput?: string | undefined;
        receiptKey?: string | null | undefined;
        deletedAt?: string | null | undefined;
    };
}>;
export type SyncPushOp = z.infer<typeof syncPushOpSchema>;
/** POST /sync request body. */
export declare const syncRequestSchema: z.ZodObject<{
    since: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    ops: z.ZodDefault<z.ZodArray<z.ZodObject<{
        op: z.ZodEnum<["create", "update", "delete"]>;
        expense: z.ZodObject<{
            id: z.ZodString;
            groupId: z.ZodString;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodString>;
            category: z.ZodString;
            merchant: z.ZodDefault<z.ZodString>;
            description: z.ZodDefault<z.ZodString>;
            paymentMethod: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            source: z.ZodEnum<["text", "image", "voice"]>;
            rawInput: z.ZodDefault<z.ZodString>;
            receiptKey: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            spentAt: z.ZodString;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            deletedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            groupId: string;
            amount: number;
            currency: string;
            category: string;
            merchant: string;
            description: string;
            paymentMethod: string | null;
            source: "text" | "image" | "voice";
            rawInput: string;
            receiptKey: string | null;
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        }, {
            id: string;
            groupId: string;
            amount: number;
            category: string;
            source: "text" | "image" | "voice";
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            currency?: string | undefined;
            merchant?: string | undefined;
            description?: string | undefined;
            paymentMethod?: string | null | undefined;
            rawInput?: string | undefined;
            receiptKey?: string | null | undefined;
            deletedAt?: string | null | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        op: "create" | "update" | "delete";
        expense: {
            id: string;
            groupId: string;
            amount: number;
            currency: string;
            category: string;
            merchant: string;
            description: string;
            paymentMethod: string | null;
            source: "text" | "image" | "voice";
            rawInput: string;
            receiptKey: string | null;
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        };
    }, {
        op: "create" | "update" | "delete";
        expense: {
            id: string;
            groupId: string;
            amount: number;
            category: string;
            source: "text" | "image" | "voice";
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            currency?: string | undefined;
            merchant?: string | undefined;
            description?: string | undefined;
            paymentMethod?: string | null | undefined;
            rawInput?: string | undefined;
            receiptKey?: string | null | undefined;
            deletedAt?: string | null | undefined;
        };
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    since: string | null;
    ops: {
        op: "create" | "update" | "delete";
        expense: {
            id: string;
            groupId: string;
            amount: number;
            currency: string;
            category: string;
            merchant: string;
            description: string;
            paymentMethod: string | null;
            source: "text" | "image" | "voice";
            rawInput: string;
            receiptKey: string | null;
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        };
    }[];
}, {
    since?: string | null | undefined;
    ops?: {
        op: "create" | "update" | "delete";
        expense: {
            id: string;
            groupId: string;
            amount: number;
            category: string;
            source: "text" | "image" | "voice";
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            currency?: string | undefined;
            merchant?: string | undefined;
            description?: string | undefined;
            paymentMethod?: string | null | undefined;
            rawInput?: string | undefined;
            receiptKey?: string | null | undefined;
            deletedAt?: string | null | undefined;
        };
    }[] | undefined;
}>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;
/** POST /sync response body. */
export declare const syncResponseSchema: z.ZodObject<{
    changed: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        groupId: z.ZodString;
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        category: z.ZodString;
        merchant: z.ZodDefault<z.ZodString>;
        description: z.ZodDefault<z.ZodString>;
        paymentMethod: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        source: z.ZodEnum<["text", "image", "voice"]>;
        rawInput: z.ZodDefault<z.ZodString>;
        receiptKey: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        spentAt: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        deletedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        groupId: string;
        amount: number;
        currency: string;
        category: string;
        merchant: string;
        description: string;
        paymentMethod: string | null;
        source: "text" | "image" | "voice";
        rawInput: string;
        receiptKey: string | null;
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }, {
        id: string;
        groupId: string;
        amount: number;
        category: string;
        source: "text" | "image" | "voice";
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        currency?: string | undefined;
        merchant?: string | undefined;
        description?: string | undefined;
        paymentMethod?: string | null | undefined;
        rawInput?: string | undefined;
        receiptKey?: string | null | undefined;
        deletedAt?: string | null | undefined;
    }>, "many">;
    cursor: z.ZodString;
}, "strip", z.ZodTypeAny, {
    changed: {
        id: string;
        groupId: string;
        amount: number;
        currency: string;
        category: string;
        merchant: string;
        description: string;
        paymentMethod: string | null;
        source: "text" | "image" | "voice";
        rawInput: string;
        receiptKey: string | null;
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }[];
    cursor: string;
}, {
    changed: {
        id: string;
        groupId: string;
        amount: number;
        category: string;
        source: "text" | "image" | "voice";
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        currency?: string | undefined;
        merchant?: string | undefined;
        description?: string | undefined;
        paymentMethod?: string | null | undefined;
        rawInput?: string | undefined;
        receiptKey?: string | null | undefined;
        deletedAt?: string | null | undefined;
    }[];
    cursor: string;
}>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;
/** POST /parse request body (one entry per pending capture). */
export declare const parseRequestSchema: z.ZodObject<{
    captures: z.ZodArray<z.ZodObject<{
        clientId: z.ZodString;
        source: z.ZodEnum<["text", "image", "voice"]>;
        text: z.ZodDefault<z.ZodString>;
        imageBase64: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "text" | "image" | "voice";
        text: string;
        clientId: string;
        imageBase64?: string | undefined;
    }, {
        source: "text" | "image" | "voice";
        clientId: string;
        text?: string | undefined;
        imageBase64?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    captures: {
        source: "text" | "image" | "voice";
        text: string;
        clientId: string;
        imageBase64?: string | undefined;
    }[];
}, {
    captures: {
        source: "text" | "image" | "voice";
        clientId: string;
        text?: string | undefined;
        imageBase64?: string | undefined;
    }[];
}>;
export type ParseRequest = z.infer<typeof parseRequestSchema>;
/** One capture's parse result, grouped under a server-assigned groupId. */
export declare const parsedGroupSchema: z.ZodObject<{
    clientId: z.ZodString;
    groupId: z.ZodString;
    receiptKey: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    expenses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        groupId: z.ZodString;
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        category: z.ZodString;
        merchant: z.ZodDefault<z.ZodString>;
        description: z.ZodDefault<z.ZodString>;
        paymentMethod: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        source: z.ZodEnum<["text", "image", "voice"]>;
        rawInput: z.ZodDefault<z.ZodString>;
        receiptKey: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        spentAt: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        deletedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        groupId: string;
        amount: number;
        currency: string;
        category: string;
        merchant: string;
        description: string;
        paymentMethod: string | null;
        source: "text" | "image" | "voice";
        rawInput: string;
        receiptKey: string | null;
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }, {
        id: string;
        groupId: string;
        amount: number;
        category: string;
        source: "text" | "image" | "voice";
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        currency?: string | undefined;
        merchant?: string | undefined;
        description?: string | undefined;
        paymentMethod?: string | null | undefined;
        rawInput?: string | undefined;
        receiptKey?: string | null | undefined;
        deletedAt?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    expenses: {
        id: string;
        groupId: string;
        amount: number;
        currency: string;
        category: string;
        merchant: string;
        description: string;
        paymentMethod: string | null;
        source: "text" | "image" | "voice";
        rawInput: string;
        receiptKey: string | null;
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }[];
    groupId: string;
    receiptKey: string | null;
    clientId: string;
}, {
    expenses: {
        id: string;
        groupId: string;
        amount: number;
        category: string;
        source: "text" | "image" | "voice";
        spentAt: string;
        createdAt: string;
        updatedAt: string;
        currency?: string | undefined;
        merchant?: string | undefined;
        description?: string | undefined;
        paymentMethod?: string | null | undefined;
        rawInput?: string | undefined;
        receiptKey?: string | null | undefined;
        deletedAt?: string | null | undefined;
    }[];
    groupId: string;
    clientId: string;
    receiptKey?: string | null | undefined;
}>;
export type ParsedGroup = z.infer<typeof parsedGroupSchema>;
/** POST /parse response body. */
export declare const parseResponseSchema: z.ZodObject<{
    groups: z.ZodArray<z.ZodObject<{
        clientId: z.ZodString;
        groupId: z.ZodString;
        receiptKey: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        expenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            groupId: z.ZodString;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodString>;
            category: z.ZodString;
            merchant: z.ZodDefault<z.ZodString>;
            description: z.ZodDefault<z.ZodString>;
            paymentMethod: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            source: z.ZodEnum<["text", "image", "voice"]>;
            rawInput: z.ZodDefault<z.ZodString>;
            receiptKey: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            spentAt: z.ZodString;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            deletedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            groupId: string;
            amount: number;
            currency: string;
            category: string;
            merchant: string;
            description: string;
            paymentMethod: string | null;
            source: "text" | "image" | "voice";
            rawInput: string;
            receiptKey: string | null;
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        }, {
            id: string;
            groupId: string;
            amount: number;
            category: string;
            source: "text" | "image" | "voice";
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            currency?: string | undefined;
            merchant?: string | undefined;
            description?: string | undefined;
            paymentMethod?: string | null | undefined;
            rawInput?: string | undefined;
            receiptKey?: string | null | undefined;
            deletedAt?: string | null | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        expenses: {
            id: string;
            groupId: string;
            amount: number;
            currency: string;
            category: string;
            merchant: string;
            description: string;
            paymentMethod: string | null;
            source: "text" | "image" | "voice";
            rawInput: string;
            receiptKey: string | null;
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        }[];
        groupId: string;
        receiptKey: string | null;
        clientId: string;
    }, {
        expenses: {
            id: string;
            groupId: string;
            amount: number;
            category: string;
            source: "text" | "image" | "voice";
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            currency?: string | undefined;
            merchant?: string | undefined;
            description?: string | undefined;
            paymentMethod?: string | null | undefined;
            rawInput?: string | undefined;
            receiptKey?: string | null | undefined;
            deletedAt?: string | null | undefined;
        }[];
        groupId: string;
        clientId: string;
        receiptKey?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    groups: {
        expenses: {
            id: string;
            groupId: string;
            amount: number;
            currency: string;
            category: string;
            merchant: string;
            description: string;
            paymentMethod: string | null;
            source: "text" | "image" | "voice";
            rawInput: string;
            receiptKey: string | null;
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        }[];
        groupId: string;
        receiptKey: string | null;
        clientId: string;
    }[];
}, {
    groups: {
        expenses: {
            id: string;
            groupId: string;
            amount: number;
            category: string;
            source: "text" | "image" | "voice";
            spentAt: string;
            createdAt: string;
            updatedAt: string;
            currency?: string | undefined;
            merchant?: string | undefined;
            description?: string | undefined;
            paymentMethod?: string | null | undefined;
            rawInput?: string | undefined;
            receiptKey?: string | null | undefined;
            deletedAt?: string | null | undefined;
        }[];
        groupId: string;
        clientId: string;
        receiptKey?: string | null | undefined;
    }[];
}>;
export type ParseResponse = z.infer<typeof parseResponseSchema>;
//# sourceMappingURL=schema.d.ts.map