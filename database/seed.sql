-- Insert default admin user
INSERT INTO users (email, password_hash, full_name, is_active, is_admin)
VALUES (
  'admin@vexacell.com',
  '$2a$10$YourHashedPasswordHere', -- Change this!
  'Admin Vexa',
  true,
  true
);

-- Insert sample price margins
INSERT INTO price_margins (category, provider_code, margin_type, margin_value, is_active)
VALUES
  ('pulsa', NULL, 'percentage', 5.00, true),
  ('data', NULL, 'percentage', 8.00, true),
  ('pln', NULL, 'fixed', 500.00, true),
  ('ewallet', NULL, 'percentage', 3.00, true),
  ('game', NULL, 'percentage', 10.00, true),
  ('ppob', NULL, 'percentage', 5.00, true);

-- Insert sample providers (will be synced from Digiflazz)
INSERT INTO providers (provider_code, provider_name, category, status)
VALUES
  ('TELKOMSEL', 'Telkomsel', 'pulsa', true),
  ('INDOSAT', 'Indosat Ooredoo', 'pulsa', true),
  ('XL', 'XL Axiata', 'pulsa', true),
  ('TRI', '3 (Tri)', 'pulsa', true),
  ('SMARTFREN', 'Smartfren', 'pulsa', true)
ON CONFLICT (provider_code) DO NOTHING;