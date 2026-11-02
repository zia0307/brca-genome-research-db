USE brca_genome_db;
-- Application users (passwords are bcrypt hashes, inserted by scripts/seed-users.js)
CREATE TABLE IF NOT EXISTS AppUser (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role ENUM('admin','researcher') NOT NULL DEFAULT 'researcher',
    researcher_id INT NULL,
    FOREIGN KEY (researcher_id) REFERENCES Researcher(researcher_id) ON DELETE SET NULL
);
