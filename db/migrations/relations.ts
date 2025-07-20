import { relations } from "drizzle-orm/relations";
import { user, account, session, subscription, programs, clients } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
	subscriptions: many(subscription),
	clients: many(clients),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const subscriptionRelations = relations(subscription, ({one}) => ({
	user: one(user, {
		fields: [subscription.userId],
		references: [user.id]
	}),
}));

export const clientsRelations = relations(clients, ({one}) => ({
	program: one(programs, {
		fields: [clients.programId],
		references: [programs.id]
	}),
	user: one(user, {
		fields: [clients.assignedTo],
		references: [user.id]
	}),
}));

export const programsRelations = relations(programs, ({many}) => ({
	clients: many(clients),
}));