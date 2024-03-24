import pool from "../config/config.js";

const addInvoice = async (req, res) => {
    const { customer_name, customer_email, customer_phone, date, line_items, userId } = req.body;
    const created_by = userId;
    console.log(req.body, 'req.body');
    if (!customer_name || !date || !line_items || line_items.length === 0) {
        return res.status(400).json({ message: 'Customer name,  date, and line items are required' });
    }

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const formattedDate = new Date(date).toISOString().split('T')[0];
            const [customerResult] = await connection.query('INSERT INTO customers (customer_name, customer_email, customer_phone) VALUES (?, ?, ?)', [customer_name, customer_email, customer_phone]);
            const customerId = customerResult.insertId
            const [invoiceResult] = await connection.query('INSERT INTO invoices (invoice_date, customer_id, created_by) VALUES (?, ?, ?)', [formattedDate, customerId, created_by]);
            const invoiceId = invoiceResult.insertId;

            for (const lineItemData of line_items) {
                await connection.query('INSERT INTO line_items (invoice_id, item_name, quantity, price) VALUES (?, ?, ?, ?)', [invoiceId, lineItemData.item_name, lineItemData.quantity, lineItemData.price]);
            }

            await connection.commit();
            connection.release();
            return res.status(201).json({ message: 'Invoice added successfully' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error adding invoice:', error);
            return res.status(500).json({ message: 'Failed to add invoice' });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ message: 'Unexpected error' });
    }
};

const deleteInvoice = async (req, res) => {
    const { invoice_id } = req.params;

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query('DELETE FROM line_items WHERE invoice_id = ?', [invoice_id]);

            await connection.query('DELETE FROM invoices WHERE invoice_id = ?', [invoice_id]);

            await connection.commit();
            connection.release();
            return res.status(200).json({ message: 'Invoice deleted successfully' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error deleting invoice:', error);
            return res.status(500).json({ message: 'Failed to delete invoice' });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ message: 'Unexpected error' });
    }
};
const getAllInvoices = async (req, res) => {
    try {
        const { user_id } = req.params;
        const query = `
            SELECT 
                invoices.invoice_id,
                invoices.invoice_date,
                customers.customer_name,
                customers.customer_email,
                customers.customer_phone,
                line_items.item_name,
                line_items.quantity,
                line_items.price
            FROM 
                invoices
            INNER JOIN 
                customers ON invoices.customer_id = customers.customer_id
            INNER JOIN 
                line_items ON invoices.invoice_id = line_items.invoice_id
            WHERE 
                invoices.created_by = ?
        `;
        const [rows] = await pool.query(query, [user_id]);

        const invoices = rows.reduce((acc, row) => {
            const { invoice_id, invoice_date, customer_name, customer_email, customer_phone, ...itemData } = row;
            const invoiceIndex = acc.findIndex(invoice => invoice.invoice_id === invoice_id);
            if (invoiceIndex === -1) {
                acc.push({
                    invoice_id,
                    invoice_date,
                    customer_name,
                    customer_email,
                    customer_phone,
                    line_items: [{ ...itemData }]
                });
            } else {
                acc[invoiceIndex].line_items.push({ ...itemData });
            }
            return acc;
        }, []);

        return res.status(200).json(invoices);
    } catch (error) {
        console.error('Error getting invoices:', error);
        return res.status(500).json({ message: 'Failed to get invoices' });
    }
};

const editInvoice = async (req, res) => {
    const { invoice_id } = req.params;
    const fieldsToUpdate = req.body;

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            let setClauseInvoice = '';
            let setClauseCustomer = '';
            const valuesInvoice = [];
            const valuesCustomer = [];

            const validFieldsInvoice = ['invoice_date', 'customer_id'];
            const validFieldsCustomer = ['customer_name', 'customer_email', 'customer_phone'];

            let customerId = null;
            const [invoiceRow] = await connection.query('SELECT customer_id FROM invoices WHERE invoice_id = ?', [invoice_id]);
            if (invoiceRow.length === 0) {
                return res.status(404).json({ message: 'Invoice not found' });
            }
            customerId = invoiceRow[0].customer_id;

            validFieldsInvoice.forEach(field => {
                if (fieldsToUpdate[field]) {
                    if (field === 'date') {
                        const formattedDate = new Date(fieldsToUpdate[field]).toISOString().split('T')[0];
                        setClauseInvoice += `${field} = ?, `;
                        valuesInvoice.push(formattedDate);
                    } else {
                        setClauseInvoice += `${field} = ?, `;
                        valuesInvoice.push(fieldsToUpdate[field]);
                    }
                }
            });

            setClauseInvoice = setClauseInvoice.slice(0, -2);

            if (fieldsToUpdate.invoice_date) {
                const date = new Date(fieldsToUpdate.invoice_date);
                const formattedDate = date.toISOString().split('T')[0];
                valuesInvoice.push(formattedDate);
            }


            validFieldsCustomer.forEach(field => {
                if (fieldsToUpdate[field]) {
                    setClauseCustomer += `${field} = ?, `;
                    valuesCustomer.push(fieldsToUpdate[field]);
                }
            });

            setClauseCustomer = setClauseCustomer.slice(0, -2);


            valuesInvoice.push(invoice_id);

            console.log(setClauseInvoice, 'setClauseInvoice');

            valuesInvoice.shift();
            console.log(valuesInvoice, 'valuesInvoice');

            await connection.query(`UPDATE invoices SET ${setClauseInvoice} WHERE invoice_id = ?`, valuesInvoice);

            if (customerId && valuesCustomer.length > 0) {
                await connection.query(`UPDATE customers SET ${setClauseCustomer} WHERE customer_id = ?`, [...valuesCustomer, customerId]);
            }

            await connection.commit();
            connection.release();
            return res.status(200).json({ message: 'Invoice updated successfully' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error updating invoice:', error);
            return res.status(500).json({ message: 'Failed to update invoice' });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ message: 'Unexpected error' });
    }
};



export default {
    getAllInvoices,
    addInvoice,
    deleteInvoice,
    editInvoice
};