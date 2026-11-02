-- BRCA1/BRCA2 Genome and Medical Research Database

DROP DATABASE IF EXISTS brca_genome_db;
CREATE DATABASE brca_genome_db;
USE brca_genome_db;

-- 1. Patient table
CREATE TABLE Patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    dob DATE NOT NULL,
    sex ENUM('Male', 'Female', 'Other') NOT NULL,
    consent_status ENUM('full', 'deidentified_only', 'withdrawn') NOT NULL DEFAULT 'deidentified_only'
);

-- 1a. Patient Phone number
CREATE TABLE PatientPhone (
    phone_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    phone_type ENUM('home', 'work', 'mobile', 'emergency') NOT NULL DEFAULT 'mobile',
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE
);

-- 2. Family Relationship table (self-referencing, associative)
CREATE TABLE FamilyRelationship (
    patient_id INT NOT NULL,
    relative_id INT NOT NULL,
    relationship_type ENUM('parent', 'sibling', 'child', 'half-sibling', 'other') NOT NULL,
    PRIMARY KEY (patient_id, relative_id),
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (relative_id) REFERENCES Patient(patient_id) ON DELETE CASCADE,
    CHECK (patient_id <> relative_id)  -- Prevents self-referencing
);

-- 3. Sample (weak entity, depends on patient)
CREATE TABLE Sample (
    sample_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    sample_type ENUM('blood', 'tumor_tissue', 'saliva', 'normal_tissue') NOT NULL,
    collection_date DATE NOT NULL,
    storage_location VARCHAR(100),
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE
);

-- 3a. Sequencing Run (weak entity, depends on sample)
-- sequencing is the process of reading a sample's DNA letter-by-letter using a machine/sequencing platform 
-- platforms could be Illumina, PacBio, Oxford Nanopore, etc.
-- one sample can have multiple sequencing runs, but each run is associated with one sample
CREATE TABLE SequencingRun (
    run_id INT AUTO_INCREMENT PRIMARY KEY,
    sample_id INT NOT NULL,
    platform varchar(50) NOT NULL,
    run_date DATE NOT NULL,
    lab VARCHAR(100),
    FOREIGN KEY (sample_id) REFERENCES Sample(sample_id) ON DELETE CASCADE
);

-- 4. Gene
-- this table stores general reference facts about the specific genes we care about (BRCA1, BRCA2), and are not specific to a patient.
-- gene symbols are unique identifiers 
-- chromosome is which numbered chromosome the gene physically sits on 
CREATE TABLE Gene (
    gene_id INT AUTO_INCREMENT PRIMARY KEY,
    gene_symbol VARCHAR(20) NOT NULL UNIQUE,
    chromosome VARCHAR(10) NOT NULL,
    description VARCHAR(255)
);

-- 5. Variant 
-- a variant is a specific change in the DNA sequence of a gene. Every variant belongs to exactly 1 gene
CREATE TABLE Variant (
    variant_id INT AUTO_INCREMENT PRIMARY KEY,
    gene_id INT NOT NULL, 
    hgvs_notation VARCHAR(100) NOT NULL UNIQUE, 
    -- the standardized scientific "address" describing exactly where the mutation is and what changed 
    -- (like a precise map coordinate).
    variant_type ENUM('missense', 'nonsense', 'frameshift', 'splice_site', 'synonymous', 'deletion', 'insertion') NOT NULL,
    -- the kind of change: whether a letter got swapped, deleted, inserted, etc, because different types have different biological consequences.
    variant_class ENUM('germline', 'somatic') NOT NULL,
    -- germline: inherited from a parent and present in every cell. can be passed down to offspring
    -- somatic: acquired during someone's lifetime, only present in certain cells (like a tumor). cannot be passed down to offspring
    clinvar_id VARCHAR(20),
    rsid VARCHAR(20), 
    -- clinvar and dbSNP are public databases, we link these rows so we can cross check against real scientific records.
    inheritance_pattern ENUM('autosomal_dominant', 'autosomal_recessive', 'unknown') NOT NULL,
    -- autosomal dominant: only one copy of the variant is needed to increase disease risk
    -- autosomal recessive: two copies of the variant are needed to increase disease risk   
    -- BRCA variants are typically autosomal dominant, but we include this field for completeness
    tumor_sample_id INT, 
    -- for somatic: which specific sample this mutation was detected in. germline is not tumor-specific
    variant_allele_frequency DECIMAL(5,4) CHECK (variant_allele_frequency is NULL OR variant_allele_frequency between 0 and 1),
    -- what fraction of the cells in that tumor sample carry this mutation.
    FOREIGN KEY (gene_id) REFERENCES Gene(gene_id) ON DELETE CASCADE,
    FOREIGN KEY (tumor_sample_id) REFERENCES Sample(sample_id) -- no odc here because even if sample is deleted we want to keep this entry
);

-- 6. Genotype Result (weak entity, associative between Sample and Variant)
CREATE TABLE GenotypeResult (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    variant_id INT NOT NULL,
    zygosity ENUM('homozygous', 'heterozygous', 'hemizygous') NOT NULL,
    -- everyone has 2 copies of most genes (one from each parent). zygosity describes whether both copies are the same (homozygous), different (heterozygous), or only one copy is present (hemizygous, e.g., for genes on the X chromosome in males).
    read_depth INT CHECK (read_depth >= 0),
    -- quality metric: how many times the sequencing machine read this specific DNA position. higher depth = more confidence
    variant_allele_frequency DECIMAL(5,4) CHECK (variant_allele_frequency is NULL OR variant_allele_frequency between 0 and 1),
    quality_score DECIMAL(6,2),
    -- lab computed quality score
    FOREIGN KEY (run_id) REFERENCES SequencingRun(run_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES Variant(variant_id) ON DELETE CASCADE,
    UNIQUE (run_id, variant_id)  -- ensures one result per sample-variant pair
);

-- 7. Condition 
-- a medical diagnosis or disease that can be associated with the specific variants we are studying. 
CREATE TABLE Condition_ (
    condition_id INT AUTO_INCREMENT PRIMARY KEY,
    condition_name VARCHAR(100) NOT NULL,
    icd_code VARCHAR(10),
    -- ICD - International Classification of Diseases. a standard code used by doctors and hospitals to classify diseases and medical conditions.
    category VARCHAR(50)
);

-- 8. Study
CREATE TABLE Study (
    study_id INT AUTO_INCREMENT PRIMARY KEY,
    study_name VARCHAR(150) NOT NULL,
    institution VARCHAR(150),
    start_date DATE,
    end_date DATE,
    inclusion_criteria TEXT
    -- description of who can participate in the study, like age range, specific genetic variants, health status, etc.
);

-- 9. Variant Condition
-- links a specific mutation to a specific disease it's known to relate to. 
CREATE TABLE VariantCondition (
    variant_id INT NOT NULL,
    condition_id INT NOT NULL,
    confidence_level ENUM('pathogenic', 'likely_pathogenic', 'uncertain_significance', 'likely_benign', 'benign') NOT NULL,
    -- how certain scientists are that this mutation actually causes or contributes to the disease.
    evidence_source VARCHAR(255) default 'ClinVar',
    -- where this classification came from.
    PRIMARY KEY (variant_id, condition_id),
    FOREIGN KEY (variant_id) REFERENCES Variant(variant_id) ON DELETE CASCADE,
    FOREIGN KEY (condition_id) REFERENCES Condition_(condition_id) ON DELETE CASCADE
);

-- 9a. Study Variant (M:N)
-- plain text summary of what the study found about this mutation, and how strong the evidence is.
CREATE TABLE StudyVariant (
    study_id INT NOT NULL,
    variant_id INT NOT NULL,
    finding VARCHAR(255),
    evidence_level VARCHAR(50),
    PRIMARY KEY (study_id, variant_id),
    FOREIGN KEY (study_id) REFERENCES Study(study_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES Variant(variant_id) ON DELETE CASCADE
);

-- 10. Researcher, Researcher Study, Study Participant
CREATE TABLE Researcher (
    researcher_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    institution VARCHAR(150),
    clearance_level ENUM('deidentified_only', 'full_access') NOT NULL DEFAULT 'deidentified_only'
    -- what patient data the researcher is allowed to access. 'deidentified_only' means they can only see data that has been stripped. 
);

-- links researchers to the studies they're involved in
CREATE TABLE ResearcherStudy (
    researcher_id INT NOT NULL,
    study_id INT NOT NULL,
    role VARCHAR(50),
    PRIMARY KEY (researcher_id, study_id),
    FOREIGN KEY (researcher_id) REFERENCES Researcher(researcher_id) ON DELETE CASCADE,
    FOREIGN KEY (study_id) REFERENCES Study(study_id) ON DELETE CASCADE
);

CREATE TABLE StudyParticipant (
    study_id INT NOT NULL,
    patient_id INT NOT NULL,
    enrollment_date DATE NOT NULL,
    PRIMARY KEY (study_id, patient_id),
    FOREIGN KEY (study_id) REFERENCES Study(study_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE
);

-- 11. Treatment 
-- a drug, surgery, or therapy that can be used to treat a specific condition.
CREATE TABLE Treatment (
    treatment_id INT AUTO_INCREMENT PRIMARY KEY,
    condition_id INT NOT NULL,
    treatment_name VARCHAR(100) NOT NULL,
    treatment_type VARCHAR(100) NOT NULL,
    FOREIGN KEY (condition_id) REFERENCES Condition_(condition_id) ON DELETE CASCADE
);

-- 12. Clinical Trial
-- formal structured research study that tests the safety and effectiveness of a treatment in humans.
CREATE TABLE ClinicalTrial (
    trial_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    phase VARCHAR(20),
    start_date DATE,
    end_date DATE,
    status ENUM('planned', 'recruiting', 'active', 'completed', 'terminated') NOT NULL,
    sponsor VARCHAR(150),
    condition_id INT NOT NULL,
    FOREIGN KEY (condition_id) REFERENCES Condition_(condition_id) ON DELETE CASCADE
);

-- 13. Trial Participant (weak, associative)
CREATE TABLE TrialParticipant (
    trial_id INT NOT NULL,
    patient_id INT NOT NULL,
    enrollment_date DATE NOT NULL,
    treatment_arm VARCHAR(50),
    -- which group of the trial the patient is assigned to (e.g., experimental drug vs. placebo)
    status ENUM('enrolled', 'completed', 'withdrawn', 'active') DEFAULT 'enrolled',
    PRIMARY KEY (trial_id, patient_id),
    FOREIGN KEY (trial_id) REFERENCES ClinicalTrial(trial_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE
);

-- 14. Trial Result 
CREATE TABLE TrialResult (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    trial_id INT NOT NULL,
    patient_id INT NOT NULL,
    timepoint VARCHAR(30) DEFAULT 'baseline',
    -- tracks which follow-up visit or timepoint this result corresponds to (e.g., baseline, 3 months, 6 months, etc.)
    response VARCHAR(255),
    outcome VARCHAR(255) NOT NULL,
    followup_months INT,
    adverse_events VARCHAR(150),
    FOREIGN KEY (trial_id, patient_id) REFERENCES TrialParticipant(trial_id, patient_id) ON DELETE CASCADE
    -- you can only have a trial result if the patient is verifiably enrolled in that trial.
);
