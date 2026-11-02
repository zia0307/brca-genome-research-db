USE brca_genome_db;

-- ===== ALTER (requirement: CREATE / ALTER / DROP) =====
ALTER TABLE Study ADD CONSTRAINT chk_study_dates CHECK (end_date IS NULL OR end_date >= start_date);
ALTER TABLE Sample ADD COLUMN notes VARCHAR(255) NULL;
ALTER TABLE Sample DROP COLUMN notes;

-- ===== INDEXES =====
CREATE INDEX idx_patient_lastname ON Patient(last_name);
CREATE INDEX idx_variant_type_class ON Variant(variant_type, variant_class);
CREATE INDEX idx_trial_status ON ClinicalTrial(status);
SHOW INDEX FROM Patient;

-- ===== CORRELATED QUERY: genotype calls with read depth above the average for their own gene =====
SELECT g.gene_symbol, v.hgvs_notation, gr.read_depth
FROM GenotypeResult gr
JOIN Variant v ON v.variant_id = gr.variant_id
JOIN Gene g    ON g.gene_id = v.gene_id
WHERE gr.read_depth > (SELECT AVG(gr2.read_depth)
                       FROM GenotypeResult gr2
                       JOIN Variant v2 ON v2.variant_id = gr2.variant_id
                       WHERE v2.gene_id = v.gene_id)
ORDER BY g.gene_symbol, gr.read_depth DESC
LIMIT 10;

-- ===== STORED FUNCTION =====
DROP FUNCTION IF EXISTS fn_patient_age;
DELIMITER $$
CREATE FUNCTION fn_patient_age(p_id INT) RETURNS INT
DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_age INT;
    SELECT TIMESTAMPDIFF(YEAR, dob, CURDATE()) INTO v_age FROM Patient WHERE patient_id = p_id;
    RETURN v_age;
END$$
DELIMITER ;
SELECT patient_id, first_name, fn_patient_age(patient_id) AS age FROM Patient LIMIT 5;
