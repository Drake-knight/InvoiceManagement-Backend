import pool from "../config/config.js";

class Customer {
    constructor(customer) {
        this.customer_name = customer.customer_name;
        this.customer_email = customer.customer_email || null;
        this.customer_phone = customer.customer_phone || null;
    }
    static async createTable() {
        const createTableSql = `
        CREATE TABLE IF NOT EXISTS customers (
            customer_id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(100) NOT NULL,
            customer_email VARCHAR(100),
            customer_phone VARCHAR(20)
        )
    `;
        try {
            await pool.query(createTableSql);
            console.log('Customers table created successfully');
        } catch (err) {
            console.error('Error creating customers table:', err);
            process.exit(-1);
        }
    }
}


class Invoice {
    constructor(invoice) {
        this.invoice_number = invoice.invoice_number;
        this.date = invoice.date;
        this.customer_id = invoice.customer_id;
        this.line_items = invoice.line_items;
        this.created_by = invoice.created_by;
    }
    static async createTable() {
        const createTableSql = `
        CREATE TABLE IF NOT EXISTS invoices (
            invoice_id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_date DATE NOT NULL,
            customer_id INT,
            created_by INT,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        )
    `;

        try {
            await pool.query(createTableSql);
            console.log('Invoices table created successfully');
        } catch (err) {
            console.error('Error creating invoices table:', err);
            process.exit(-1);
        }
    }
}


class LineItem {
    constructor(lineItem) {
        this.invoice_id = lineItem.invoice_id;
        this.item_name = lineItem.item_name;
        this.quantity = lineItem.quantity;
        this.price = lineItem.price;
    }

    static async createTable() {
        const createTableSql = `
        CREATE TABLE IF NOT EXISTS line_items (
            line_item_id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_id INT,
            item_name VARCHAR(100) NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
        )
    `
            ;

        try {
            await pool.query(createTableSql);
            console.log('LineItems table created successfully');
        } catch (err) {
            console.error('Error creating line_items table:', err);
            process.exit(-1);
        }
    }
}

class User {
    constructor(user) {
        this.username = user.username;
        this.password = user.password;
        this.email = user.email;
    }
    static async createTable() {
        const createTableSql = `
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE
        )
    `;

        try {
            await pool.query(createTableSql);
            console.log('Users table created successfully');
        } catch (err) {
            console.error('Error creating users table:', err);
            process.exit(-1);
        }
    }
}

export { Customer, Invoice, LineItem, User };
