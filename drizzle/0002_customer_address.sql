ALTER TABLE customers ADD COLUMN shipping_name TEXT;
ALTER TABLE customers ADD COLUMN shipping_address TEXT;
ALTER TABLE customers ADD COLUMN shipping_city TEXT;
ALTER TABLE customers ADD COLUMN shipping_state TEXT;
ALTER TABLE customers ADD COLUMN shipping_zip TEXT;
ALTER TABLE customers ADD COLUMN shipping_country TEXT DEFAULT 'US';
