USE brca_genome_db;
-- 1. VIEW: what a 'deidentified_only' researcher may see (no names/DOB, no withdrawn patients)
CREATE OR REPLACE VIEW v_deidentified_patient AS
SELECT patient_id,
       CASE WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) < 40 THEN '<40'
            WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) < 60 THEN '40-59'
            ELSE '60+' END AS age_band,
       sex
FROM Patient WHERE consent_status <> 'withdrawn';


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

