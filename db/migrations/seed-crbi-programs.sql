-- Multi-Country CRBI Programs Data Insertion
-- Based on 2024-2025 market research

-- Insert Portugal Golden Visa Program
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('Portugal Golden Visa', 'PT', 'Portugal', 'residency_by_investment', 'Portuguese residence permit through investment with path to citizenship in 5 years', 250000, 1500000, 12, true, '{"hasDigitalPortal": true, "portalIntegrationLevel": "full", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}');

-- Insert Greece Golden Visa Program  
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('Greece Golden Visa', 'GR', 'Greece', 'residency_by_investment', 'Greek residence permit through real estate or other qualifying investments', 400000, 800000, 9, true, '{"hasDigitalPortal": true, "portalIntegrationLevel": "full", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}');

-- Insert Grenada CBI Program
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('Grenada Citizenship by Investment', 'GD', 'Grenada', 'citizenship_by_investment', '#1 ranked CBI program with E-2 visa treaty access to USA', 150000, 400000, 6, true, '{"hasDigitalPortal": true, "portalIntegrationLevel": "full", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}');

-- Insert St. Lucia CBI Program
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('St. Lucia Citizenship by Investment', 'LC', 'Saint Lucia', 'citizenship_by_investment', '#2 ranked CBI program with strong family options and fast processing', 100000, 300000, 6, true, '{"hasDigitalPortal": true, "portalIntegrationLevel": "partial", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}');

-- Insert Antigua & Barbuda CBI Program
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('Antigua & Barbuda Citizenship by Investment', 'AG', 'Antigua and Barbuda', 'citizenship_by_investment', 'Most affordable CBI program for families with multiple investment routes', 100000, 400000, 6, true, '{"hasDigitalPortal": true, "portalIntegrationLevel": "partial", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}');

-- Insert Dominica CBI Program
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('Dominica Citizenship by Investment', 'DM', 'Dominica', 'citizenship_by_investment', 'Established CBI program with competitive pricing and nature-focused investment', 100000, 200000, 8, true, '{"hasDigitalPortal": false, "portalIntegrationLevel": "none", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}');

-- Insert St. Kitts & Nevis CBI Program (update existing)
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('St. Kitts & Nevis Citizenship by Investment', 'KN', 'Saint Kitts and Nevis', 'citizenship_by_investment', 'The original and fastest CBI program with excellent reputation', 250000, 400000, 4, true, '{"hasDigitalPortal": true, "portalIntegrationLevel": "full", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}')
ON CONFLICT (country_code, program_name) DO UPDATE SET
  description = EXCLUDED.description,
  min_investment = EXCLUDED.min_investment,
  max_investment = EXCLUDED.max_investment,
  processing_time_months = EXCLUDED.processing_time_months,
  metadata = EXCLUDED.metadata;

-- Insert Vanuatu CBI Program
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('Vanuatu Citizenship by Investment', 'VU', 'Vanuatu', 'citizenship_by_investment', 'Fastest CBI program globally with 2-3 months processing time', 130000, 180000, 3, true, '{"hasDigitalPortal": false, "portalIntegrationLevel": "none", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}');

-- Insert Turkey CBI Program
INSERT INTO crbi_programs (program_name, country_code, country_name, program_type, description, min_investment, max_investment, processing_time_months, is_active, metadata) VALUES
('Turkey Citizenship by Investment', 'TR', 'Turkey', 'citizenship_by_investment', 'European-positioned CBI program with real estate investment focus', 400000, 1000000, 8, true, '{"hasDigitalPortal": false, "portalIntegrationLevel": "none", "lastUpdated": "2025-01-15T00:00:00Z", "source": "multi-country-seed-2025"}');

-- Insert investment options for Portugal Golden Visa
INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Investment Fund', 'Qualified Investment Fund', 'Investment in Portuguese investment funds or venture capital funds', 250000, 60, true, 1
FROM crbi_programs p WHERE p.country_code = 'PT' AND p.program_name = 'Portugal Golden Visa';

INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Real Estate', 'Real Estate Investment', 'Purchase of real estate property for residential rehabilitation', 400000, 60, true, 2
FROM crbi_programs p WHERE p.country_code = 'PT' AND p.program_name = 'Portugal Golden Visa';

INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Business Investment', 'Business Creation/Job Creation', 'Creation of business activity with job creation (10+ jobs)', 500000, 60, true, 3
FROM crbi_programs p WHERE p.country_code = 'PT' AND p.program_name = 'Portugal Golden Visa';

-- Insert investment options for Greece Golden Visa
INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Real Estate', 'Real Estate Investment (General)', 'Purchase of real estate property outside Athens/Thessaloniki', 400000, 60, true, 1
FROM crbi_programs p WHERE p.country_code = 'GR' AND p.program_name = 'Greece Golden Visa';

INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Real Estate', 'Real Estate Investment (Athens/Thessaloniki)', 'Purchase of real estate in Athens, Thessaloniki, or islands', 800000, 60, true, 2
FROM crbi_programs p WHERE p.country_code = 'GR' AND p.program_name = 'Greece Golden Visa';

INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Government Bonds', 'Greek Government Bonds', 'Purchase of Greek government bonds or corporate bonds', 400000, 36, true, 3
FROM crbi_programs p WHERE p.country_code = 'GR' AND p.program_name = 'Greece Golden Visa';

-- Insert investment options for Grenada CBI
INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, family_pricing, holding_period_months, is_active, sort_order)
SELECT p.id, 'Donation', 'National Transformation Fund', 'Non-refundable contribution to National Transformation Fund', 150000, '{"spouse": 25000, "child_under_18": 25000, "child_18_30": 50000, "parent_over_65": 50000}', 0, true, 1
FROM crbi_programs p WHERE p.country_code = 'GD' AND p.program_name = 'Grenada Citizenship by Investment';

INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Real Estate', 'Approved Real Estate Investment', 'Investment in government-approved real estate project', 270000, 84, true, 2
FROM crbi_programs p WHERE p.country_code = 'GD' AND p.program_name = 'Grenada Citizenship by Investment';

-- Insert investment options for St. Lucia CBI
INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, family_pricing, holding_period_months, is_active, sort_order)
SELECT p.id, 'Donation', 'National Economic Fund', 'Non-refundable contribution to National Economic Fund', 100000, '{"spouse": 25000, "child_under_18": 10000, "child_18_25": 25000, "parent_over_65": 25000}', 0, true, 1
FROM crbi_programs p WHERE p.country_code = 'LC' AND p.program_name = 'St. Lucia Citizenship by Investment';

INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Real Estate', 'Approved Real Estate', 'Investment in approved tourism or real estate project', 300000, 60, true, 2
FROM crbi_programs p WHERE p.country_code = 'LC' AND p.program_name = 'St. Lucia Citizenship by Investment';

-- Insert investment options for Antigua & Barbuda CBI
INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, family_pricing, holding_period_months, is_active, sort_order)
SELECT p.id, 'Donation', 'National Development Fund', 'Non-refundable contribution to National Development Fund', 100000, '{"family_of_4": 100000, "additional_dependent": 25000}', 0, true, 1
FROM crbi_programs p WHERE p.country_code = 'AG' AND p.program_name = 'Antigua & Barbuda Citizenship by Investment';

INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Real Estate', 'Approved Real Estate Investment', 'Investment in approved real estate development', 325000, 60, true, 2
FROM crbi_programs p WHERE p.country_code = 'AG' AND p.program_name = 'Antigua & Barbuda Citizenship by Investment';

INSERT INTO investment_options (program_id, option_type, option_name, description, base_amount, holding_period_months, is_active, sort_order)
SELECT p.id, 'Business Investment', 'Business Investment', 'Investment in approved business with job creation', 400000, 60, true, 3
FROM crbi_programs p WHERE p.country_code = 'AG' AND p.program_name = 'Antigua & Barbuda Citizenship by Investment';

-- Continue with remaining programs...
-- (Add more investment options for other programs as needed)