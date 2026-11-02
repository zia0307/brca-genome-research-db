USE brca_genome_db;

-- ===================== DML =====================

-- INSERT
INSERT INTO Patient (first_name, last_name, dob, sex, consent_status)
VALUES ('Demo', 'Patient', '1990-05-15', 'Female', 'full');
SET @pid = LAST_INSERT_ID();
INSERT INTO PatientPhone (patient_id, phone_number, phone_type) VALUES (@pid, '9876543210', 'mobile');

-- UPDATE (with subquery): close finished trials that have no active participants
UPDATE ClinicalTrial SET status = 'completed'
WHERE status = 'active' AND end_date < CURDATE()
  AND trial_id NOT IN (SELECT trial_id FROM TrialParticipant WHERE status = 'active');

-- DELETE (cascades to PatientPhone)
DELETE FROM Patient WHERE patient_id = @pid;

-- SELECT: multi-table JOIN + ORDER BY
SELECT CONCAT(p.first_name,' ',p.last_name) AS patient, g.gene_symbol, v.hgvs_notation, gr.zygosity
FROM Patient p
JOIN Sample s          ON s.patient_id = p.patient_id
JOIN SequencingRun sr  ON sr.sample_id = s.sample_id
JOIN GenotypeResult gr ON gr.run_id = sr.run_id
JOIN Variant v         ON v.variant_id = gr.variant_id
JOIN Gene g            ON g.gene_id = v.gene_id
ORDER BY patient LIMIT 10;

-- SELECT: GROUP BY + aggregate + HAVING (variants with 3+ distinct carriers)
SELECT v.hgvs_notation, COUNT(DISTINCT s.patient_id) AS carriers, ROUND(AVG(gr.read_depth),1) AS avg_depth
FROM Variant v
JOIN GenotypeResult gr ON gr.variant_id = v.variant_id
JOIN SequencingRun sr  ON sr.run_id = gr.run_id
JOIN Sample s          ON s.sample_id = sr.sample_id
GROUP BY v.variant_id, v.hgvs_notation
HAVING carriers >= 3
ORDER BY carriers DESC;

-- SELECT: subquery (patients carrying a pathogenic variant)
SELECT p.patient_id, p.first_name, p.last_name
FROM Patient p
WHERE p.patient_id IN (
    SELECT s.patient_id
    FROM Sample s
    JOIN SequencingRun sr    ON sr.sample_id = s.sample_id
    JOIN GenotypeResult gr   ON gr.run_id = sr.run_id
    JOIN VariantCondition vc ON vc.variant_id = gr.variant_id
    WHERE vc.confidence_level = 'pathogenic');

-- SELECT: LEFT JOIN (patients never enrolled in a trial)
SELECT p.patient_id, p.first_name
FROM Patient p LEFT JOIN TrialParticipant tp ON tp.patient_id = p.patient_id
WHERE tp.patient_id IS NULL LIMIT 5;

-- ================= ADVANCED FEATURES =================

-- 1. VIEW: what a 'deidentified_only' researcher may see (no names/DOB, no withdrawn patients)
CREATE OR REPLACE VIEW v_deidentified_patient AS
SELECT patient_id,
       CASE WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) < 40 THEN '<40'
            WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) < 60 THEN '40-59'
            ELSE '60+' END AS age_band,
       sex
FROM Patient WHERE consent_status <> 'withdrawn';

SELECT * FROM v_deidentified_patient LIMIT 5;

-- 2. TRIGGER: block trial enrollment for patients who withdrew consent
DROP TRIGGER IF EXISTS trg_block_withdrawn;
DELIMITER $$
CREATE TRIGGER trg_block_withdrawn BEFORE INSERT ON TrialParticipant
FOR EACH ROW
BEGIN
    IF (SELECT consent_status FROM Patient WHERE patient_id = NEW.patient_id) = 'withdrawn' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot enroll: patient withdrew consent';
    END IF;
END$$
DELIMITER ;

-- 3 + 4. STORED PROCEDURE with a TRANSACTION: enroll patient + baseline result, all or nothing
DROP PROCEDURE IF EXISTS sp_enroll_patient;
DELIMITER $$
CREATE PROCEDURE sp_enroll_patient(IN p_trial INT, IN p_patient INT, IN p_arm VARCHAR(50))
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

    START TRANSACTION;
    SELECT status INTO v_status FROM ClinicalTrial WHERE trial_id = p_trial FOR UPDATE;
    IF v_status IS NULL OR v_status NOT IN ('recruiting','active') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trial is not open for enrollment';
    END IF;
    INSERT INTO TrialParticipant (trial_id, patient_id, enrollment_date, treatment_arm)
        VALUES (p_trial, p_patient, CURDATE(), p_arm);
    INSERT INTO TrialResult (trial_id, patient_id, timepoint, response, outcome, followup_months)
        VALUES (p_trial, p_patient, 'baseline', 'Baseline assessment', 'Enrolled; baseline recorded', 0);
    COMMIT;
END$$
DELIMITER ;

-- Demos
CALL sp_enroll_patient(3, 1, 'experimental');                       -- succeeds
SELECT * FROM TrialResult WHERE trial_id = 3 AND patient_id = 1;
-- CALL sp_enroll_patient(3, 1, 'experimental');                    -- fails (duplicate) -> rolled back
-- CALL sp_enroll_patient(2, 5, 'experimental');                    -- fails (trial completed)
-- INSERT INTO TrialParticipant (trial_id, patient_id, enrollment_date) VALUES (1, 12, CURDATE());  -- trigger blocks (patient 12 withdrawn)
