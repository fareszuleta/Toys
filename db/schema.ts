import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  demoCard: integer("demo_card", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});
export const cartItems = sqliteTable("cart_items", {
  userId: text("user_id").notNull(),
  sku: text("sku").notNull(),
  quantity: integer("quantity").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, t => [primaryKey({ columns: [t.userId, t.sku] })]);
export const favorites = sqliteTable("favorites", {
  userId: text("user_id").notNull(),
  sku: text("sku").notNull(),
}, t => [primaryKey({ columns: [t.userId, t.sku] })]);
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").notNull(),
  mode: text("mode").notNull(),
  itemsJson: text("items_json").notNull(),
  total: integer("total").notNull(),
  shipping: integer("shipping").notNull(),
  stripeSessionId: text("stripe_session_id").unique(),
  createdAt: integer("created_at").notNull(),
});
