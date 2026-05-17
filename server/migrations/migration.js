exports.up = function (knex) {
	return knex.schema
		.createTable("users", (table) => {
			table.increments("id").primary();
			table.string("username").unique().notNullable();
			table.string("email").unique().notNullable();
			table.string("password").notNullable();
		})
		.createTable("roles", (table) => {
			table.increments("id").primary();
			table.string("name").unique().notNullable();
		})
		.createTable("user_roles", (table) => {
			table.increments("id").primary();
			table
				.integer("user_id")
				.unsigned()
				.references("id")
				.inTable("users")
				.onDelete("CASCADE");
			table
				.integer("role_id")
				.unsigned()
				.references("id")
				.inTable("roles")
				.onDelete("CASCADE");
		})

		.createTable("products", (table) => {
			table.increments("id").primary();
			table.string("name").notNullable();
			table.text("description");
			table.decimal("price", 10, 2).notNullable();
			table.integer("stock").defaultTo(0);
		})
		.createTable("orders", (table) => {
			table.increments("id").primary();
			table
				.integer("user_id")
				.unsigned()
				.references("id")
				.inTable("users")
				.onDelete("CASCADE");
			table.decimal("total_amount", 10, 2).notNullable();
			table.string("status").defaultTo("pending");
			table.text("items").notNullable();
			table.timestamps(true, true);
		});
};

exports.down = function (knex) {
	return knex.schema
		.dropTable("user_roles")
		.dropTable("users")
		.dropTable("roles")
		.dropTable("orders")
		.dropTable("products");
};